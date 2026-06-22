import threading
import time
from datetime import datetime

import cv2
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk


class ScannerUI:
    def __init__(self, scanner):
        self.scanner = scanner
        self.root = tk.Tk()
        self.root.title("Gloria Victis - Inventory Scanner")
        self.root.minsize(600, 300)

        g = scanner.config["grid"]
        self.rows = g["rows"]
        self.cols = g["cols"]
        self.slot_w = g["slot_width"]
        self.slot_h = g["slot_height"]

        self.auto_var = tk.BooleanVar(value=False)
        self._build_ui()
        self._poll_loop()

    # ------------------------------------------------------------------
    def _build_ui(self):
        # Top bar
        top = ttk.Frame(self.root)
        top.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(top, text="Scan Now", command=self._start_scan).pack(side=tk.LEFT, padx=2)
        ttk.Checkbutton(top, text="Auto", variable=self.auto_var).pack(side=tk.LEFT, padx=5)

        self.focus_lbl = ttk.Label(top, text="Game: ?", font=("", 9, "bold"))
        self.focus_lbl.pack(side=tk.RIGHT, padx=5)

        # Scrollable grid area
        canvas = tk.Canvas(self.root)
        scroll = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scroll.set)

        self.grid_frame = ttk.Frame(canvas)
        canvas.create_window((0, 0), window=self.grid_frame, anchor="nw")
        self.grid_frame.bind("<Configure>",
                             lambda e: canvas.configure(scrollregion=canvas.bbox("all")))

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)

        # Build slot cells
        self.cells = []
        for r in range(self.rows):
            row_cells = []
            for c in range(self.cols):
                cell = ttk.Frame(self.grid_frame, relief=tk.RIDGE, borderwidth=2, padding=2)
                cell.grid(row=r, column=c, padx=1, pady=1)

                img_lbl = ttk.Label(cell)
                img_lbl.pack()

                name_lbl = ttk.Label(cell, font=("Arial", 7), wraplength=70)
                name_lbl.pack()

                amt_lbl = ttk.Label(cell, font=("Arial", 8, "bold"))
                amt_lbl.pack()

                row_cells.append({"img": img_lbl, "name": name_lbl, "amt": amt_lbl})
            self.cells.append(row_cells)

        # Status bar
        self.status_lbl = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN, anchor=tk.W)
        self.status_lbl.pack(fill=tk.X, side=tk.BOTTOM)

    # ------------------------------------------------------------------
    def _start_scan(self):
        self.status_lbl.config(text="Scanning ...")
        threading.Thread(target=self._do_scan, daemon=True).start()

    def _do_scan(self):
        try:
            if not self.scanner._is_game_active():
                self.root.after(0, lambda: self.status_lbl.config(
                    text="Game not focused — switch to the game and try again"))
                return

            screenshot = self.scanner.capture_screen()
            slots = self.scanner.extract_slots(screenshot)

            results = []
            for slot in slots:
                result = self.scanner.scan_slot(slot["image"], slot["index"])
                if result:
                    results.append((slot["image"], result))

            self.root.after(0, lambda: self._update_grid(results))
            ts = datetime.now().strftime("%H:%M:%S")
            self.root.after(0, lambda: self.status_lbl.config(
                text=f"Scan done @ {ts} — {len(results)} items"))

        except Exception as e:
            err = str(e)
            self.root.after(0, lambda err=err: self.status_lbl.config(text=f"Error: {err}"))

    # ------------------------------------------------------------------
    def _update_grid(self, results):
        result_map = {r[1]["slot"]: (img, r[1]) for img, r in results}

        for r in range(self.rows):
            for c in range(self.cols):
                idx = r * self.cols + c
                cell = self.cells[r][c]

                if idx in result_map:
                    slot_img, result = result_map[idx]

                    # Scale image for display (2x)
                    scale = 2
                    display = cv2.resize(slot_img,
                                         (self.slot_w * scale, self.slot_h * scale))
                    rgb = cv2.cvtColor(display, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(rgb)
                    tk_img = ImageTk.PhotoImage(pil_img)

                    cell["img"].config(image=tk_img)
                    cell["img"].image = tk_img

                    item = self.scanner.db.get_item(result["item_id"])
                    if item and item.get("unidentified"):
                        label = "?"
                        color = "orange"
                    else:
                        names = (item or {}).get("names", {})
                        label = (names.get("en") or names.get("ru")
                                 or result["item_id"][:12])
                        color = "black"

                    cell["name"].config(text=label, foreground=color)
                    cell["amt"].config(text=f"x{result['amount']}", foreground="green")
                else:
                    cell["img"].config(image="")
                    cell["img"].image = None
                    cell["name"].config(text="")
                    cell["amt"].config(text="")

    # ------------------------------------------------------------------
    def _poll_focus(self):
        active = self.scanner._is_game_active()
        if active:
            self.focus_lbl.config(text="Game: ON", foreground="green")
        else:
            self.focus_lbl.config(text="Game: OFF", foreground="red")
        self.root.after(500, self._poll_focus)

    def _poll_loop(self):
        self._poll_focus()

    # ------------------------------------------------------------------
    def run(self):
        self.root.mainloop()
