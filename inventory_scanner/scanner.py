#!/usr/bin/env python3
import argparse
import sys
import time
from datetime import datetime
from pathlib import Path

import cv2
import mss
import numpy as np
import win32gui
import yaml

from db_handler import DBHandler
from icon_matcher import IconMatcher
from ocr_handler import OCRHandler


class InventoryScanner:
    def __init__(self, config_path="config.yaml"):
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        g = self.config["grid"]
        self.rows = g["rows"]
        self.cols = g["cols"]
        self.slot_w = g["slot_width"]
        self.slot_h = g["slot_height"]
        self.start_x = g["start_x"]
        self.start_y = g["start_y"]
        self.offset_x = g["offset_x"]
        self.offset_y = g["offset_y"]

        self.matcher = IconMatcher(
            templates_dir="templates",
            unknown_dir="templates/unknown",
            threshold=self.config["matching"]["threshold"],
        )

        ocr_cfg = self.config.get("ocr", {})
        self.ocr = OCRHandler(
            tesseract_cmd=ocr_cfg.get("tesseract_cmd"),
            psm=ocr_cfg.get("psm", 7),
            whitelist=ocr_cfg.get("char_whitelist", "0123456789"),
        )

        db_cfg = self.config.get("database", {})
        self.db = DBHandler(db_path=db_cfg.get("path", "inventory_db.json"))

    # ------------------------------------------------------------------
    # Screen capture
    # ------------------------------------------------------------------
    def _get_window_rect(self):
        title = self.config.get("screen", {}).get("game_window_title", "")
        if title:
            try:
                import pygetwindow as gw
                windows = gw.getWindowsWithTitle(title)
                if windows:
                    w = windows[0]
                    return {"left": w.left, "top": w.top,
                            "width": w.width, "height": w.height}
            except Exception:
                pass

        fallback = self.config.get("screen", {}).get("region")
        if fallback and len(fallback) == 4:
            return {"left": fallback[0], "top": fallback[1],
                    "width": fallback[2], "height": fallback[3]}

        raise RuntimeError(
            "Could not locate game window. Set 'game_window_title' "
            "or 'region' in config.yaml"
        )

    def _is_game_active(self):
        title = self.config.get("screen", {}).get("game_window_title", "")
        if not title:
            return True
        try:
            hwnd = win32gui.GetForegroundWindow()
            return title.lower() in win32gui.GetWindowText(hwnd).lower()
        except Exception:
            return True

    def capture_screen(self):
        rect = self._get_window_rect()
        with mss.MSS() as sct:
            monitor = {"top": rect["top"], "left": rect["left"],
                       "width": rect["width"], "height": rect["height"]}
            img = sct.grab(monitor)
            return np.array(img)[:, :, :3]  # drop alpha

    # ------------------------------------------------------------------
    # Slot grid
    # ------------------------------------------------------------------
    def extract_slots(self, screenshot):
        slots = []
        for row in range(self.rows):
            for col in range(self.cols):
                x = self.start_x + col * (self.slot_w + self.offset_x)
                y = self.start_y + row * (self.slot_h + self.offset_y)
                slot_img = screenshot[y:y + self.slot_h, x:x + self.slot_w]
                slots.append({
                    "row": row,
                    "col": col,
                    "index": row * self.cols + col,
                    "image": slot_img,
                })
        return slots

    @staticmethod
    def is_slot_filled(slot_img):
        gray = cv2.cvtColor(slot_img, cv2.COLOR_BGR2GRAY)
        return np.std(gray) > 8.0 or np.mean(gray) > 30.0

    # ------------------------------------------------------------------
    # Single slot
    # ------------------------------------------------------------------
    def scan_slot(self, slot_img, slot_index):
        if not self.is_slot_filled(slot_img):
            return None

        item_id, confidence = self.matcher.match(slot_img)

        if item_id is None:
            unknown_file = self.matcher.save_unknown(slot_img)
            item_id = Path(unknown_file).stem
            self.db.add_item(item_id, unknown_file, unidentified=True)
        else:
            db_item = self.db.get_item(item_id)
            if db_item is None:
                self.db.add_item(item_id, f"{item_id}.png",
                                 unidentified=False)

        amount = self.ocr.read_stack_amount(slot_img)
        self.db.record_scan(item_id, amount, slot_index)

        return {
            "item_id": item_id,
            "amount": amount,
            "slot": slot_index,
            "confidence": confidence,
        }

    # ------------------------------------------------------------------
    # Full scan
    # ------------------------------------------------------------------
    def scan_inventory(self):
        if not self._is_game_active() and not self._wait_for_game("scanning"):
            return []
        print("Capturing screen ...")
        screenshot = self.capture_screen()
        print(f"Captured {screenshot.shape[1]}x{screenshot.shape[0]}")

        slots = self.extract_slots(screenshot)
        results = []

        for slot in slots:
            result = self.scan_slot(slot["image"], slot["index"])
            if result:
                item = self.db.get_item(result["item_id"])
                if item and item.get("unidentified"):
                    label = f"[UNKNOWN] {result['item_id']}"
                else:
                    names = (item or {}).get("names", {})
                    label = (names.get("en") or names.get("ru")
                             or result["item_id"])
                print(
                    f"  slot {result['slot']:3d} "
                    f"({slot['row']},{slot['col']}): "
                    f"{label:28s} x{result['amount']:>5d}"
                )
                results.append(result)

        self.db.log_scan({
            "timestamp": datetime.now().isoformat(),
            "items_found": len(results),
            "items": results,
        })

        unidentified = self.db.get_unidentified()
        if unidentified:
            print(f"\n  {len(unidentified)} unidentified item(s) saved "
                  f"to templates/unknown/")
            print(f"  Name them with:")
            print(f"    scanner.py --name <item_id> "
                  f"--en \"English name\" --ru \"Русское имя\"")

        print(f"\n  Scan complete: {len(results)} items recorded")
        return results

    # ------------------------------------------------------------------
    # Calibration
    # ------------------------------------------------------------------
    def _wait_for_game(self, action="continue"):
        for remaining in range(5, 0, -1):
            print(f"\r  Switch to the game window — {action} in {remaining}s ...", end="")
            time.sleep(1)
        print()
        if not self._is_game_active():
            print("  Game window still not active — aborting.")
            return False
        return True

    def calibrate(self):
        if not self._is_game_active() and not self._wait_for_game("calibrating"):
            return
        print("Calibration: capturing screen and drawing grid ...")
        screenshot = self.capture_screen()
        overlay = screenshot.copy()
        slots = self.extract_slots(screenshot)

        for slot in slots:
            x = self.start_x + slot["col"] * (self.slot_w + self.offset_x)
            y = self.start_y + slot["row"] * (self.slot_h + self.offset_y)
            color = (0, 255, 0) if self.is_slot_filled(slot["image"]) \
                     else (0, 0, 255)
            cv2.rectangle(overlay, (x, y),
                          (x + self.slot_w, y + self.slot_h),
                          color, 2)

        out = "calibration_output.png"
        cv2.imwrite(out, overlay)
        print(f"  Saved {out} — green=filled, red=empty")
        print("  Adjust config.yaml grid values if slots are misaligned.")

    # ------------------------------------------------------------------
    # Naming
    # ------------------------------------------------------------------
    def name_item(self, item_id, name_en, name_ru):
        if not self.db.name_item(item_id, name_en, name_ru):
            print(f"  Item '{item_id}' not found in database")
            return

        print(f"  Named: {name_en or '?'} / {name_ru or '?'}")

        new_name = (name_en or name_ru or item_id) \
            .lower().replace(" ", "_")
        new_filename = f"{new_name}.png"

        src = Path("templates/unknown") / f"{item_id}.png"
        dst = Path("templates") / new_filename
        if src.exists():
            src.rename(dst)
            print(f"  Moved template: {src.name} -> {new_filename}")
        else:
            # template might already be in templates/
            src2 = Path("templates") / f"{item_id}.png"
            if src2.exists():
                src2.rename(dst)
                print(f"  Renamed template: {item_id}.png -> {new_filename}")

        self.matcher.reload()

    # ------------------------------------------------------------------
    # List unidentified
    # ------------------------------------------------------------------
    def list_unidentified(self):
        items = self.db.get_unidentified()
        if not items:
            print("  No unidentified items")
            return
        print(f"  Unidentified items ({len(items)}):")
        for item_id, item in items.items():
            print(f"    {item_id:30s} ({item['template']})")
        print()
        print(f"  Name them:")
        print(f"    scanner.py --name <item_id> "
              f"--en \"Name\" --ru \"Имя\"")

    # ------------------------------------------------------------------
    # Print summary
    # ------------------------------------------------------------------
    def summary(self):
        items = self.db.get_all_items()
        if not items:
            print("  Database is empty.")
            return

        print(f"  All known items ({len(items)}):")
        for item_id, item in sorted(items.items()):
            en = item["names"].get("en") or "-"
            ru = item["names"].get("ru") or "-"
            total = sum(h["amount"] for h in item["history"])
            counts = len(item["history"])
            print(f"    {item_id:30s} en={en:20s} ru={ru:20s} "
                  f"total={total:>6d} scans={counts}")

    # ------------------------------------------------------------------
    # Auto-detect loop
    # ------------------------------------------------------------------
    def auto_detect_loop(self):
        ad = self.config.get("auto_detect", {})
        if not ad.get("enabled", False):
            print("  Auto-detect is disabled in config.yaml")
            return

        interval = ad.get("poll_interval", 0.5)
        print(f"  Auto-detect running (poll every {interval}s) ...")
        print("  Press Ctrl+C to stop")

        try:
            while True:
                if not self._is_game_active():
                    time.sleep(interval)
                    continue
                screenshot = self.capture_screen()
                region_cfg = ad.get("inventory_open_check", {}) \
                              .get("region")
                if region_cfg:
                    x, y, w, h = region_cfg
                    region = screenshot[y:y + h, x:x + w]
                    if self._is_inventory_open(region):
                        ts = datetime.now().strftime("%H:%M:%S")
                        print(f"\n=== Inventory open @ {ts} ===")
                        self.scan_inventory()
                        time.sleep(2)
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n  Stopped")

    @staticmethod
    def _is_inventory_open(region_img):
        return np.mean(region_img) > 15


# ======================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Gloria Victis Inventory Scanner"
    )
    parser.add_argument("--config", default="config.yaml",
                        help="Path to config file")
    parser.add_argument("--scan", action="store_true",
                        help="Run a single inventory scan")
    parser.add_argument("--calibrate", action="store_true",
                        help="Draw grid overlay for alignment check")
    parser.add_argument("--auto", action="store_true",
                        help="Start auto-detect loop")
    parser.add_argument("--name", type=str,
                        help="Item ID to name (use with --en / --ru)")
    parser.add_argument("--en", type=str,
                        help="English name for --name")
    parser.add_argument("--ru", type=str,
                        help="Russian name for --name")
    parser.add_argument("--list-unknown", action="store_true",
                        help="List all unidentified items")
    parser.add_argument("--summary", action="store_true",
                        help="Show all known items and totals")
    parser.add_argument("--ui", action="store_true",
                        help="Open the inventory scanner UI")

    args = parser.parse_args()

    if len(sys.argv) == 1:
        parser.print_help()
        return

    scanner = InventoryScanner(config_path=args.config)

    if args.ui:
        from scanner_ui import ScannerUI
        ScannerUI(scanner).run()
    elif args.calibrate:
        scanner.calibrate()
    elif args.name:
        scanner.name_item(args.name, args.en, args.ru)
    elif args.list_unknown:
        scanner.list_unidentified()
    elif args.summary:
        scanner.summary()
    elif args.scan:
        scanner.scan_inventory()
    elif args.auto:
        scanner.auto_detect_loop()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
