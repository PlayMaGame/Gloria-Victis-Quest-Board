import hashlib
from pathlib import Path
from datetime import datetime

import cv2


class IconMatcher:
    def __init__(self, templates_dir="templates",
                 unknown_dir="templates/unknown", threshold=0.80):
        self.templates_dir = Path(templates_dir)
        self.unknown_dir = Path(unknown_dir)
        self.threshold = threshold
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.unknown_dir.mkdir(parents=True, exist_ok=True)
        self.templates = {}
        self._load_templates()

    def _load_templates(self):
        self.templates.clear()
        for f in sorted(self.templates_dir.glob("*.png")):
            img = cv2.imread(str(f), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                self.templates[f.stem] = {
                    "image": img,
                    "w": img.shape[1],
                    "h": img.shape[0],
                }

    def match(self, slot_img):
        gray = cv2.cvtColor(slot_img, cv2.COLOR_BGR2GRAY)
        best_name = None
        best_val = 0.0

        for name, tmpl in self.templates.items():
            if gray.shape[0] < tmpl["h"] or gray.shape[1] < tmpl["w"]:
                continue
            result = cv2.matchTemplate(gray, tmpl["image"],
                                       cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            if max_val > best_val:
                best_val = max_val
                best_name = name

        if best_val >= self.threshold:
            return best_name, best_val
        return None, best_val

    def save_unknown(self, slot_img):
        raw = slot_img.tobytes()
        h = hashlib.md5(raw).hexdigest()[:8]
        filename = f"unk_{h}.png"
        filepath = self.unknown_dir / filename
        cv2.imwrite(str(filepath), slot_img)
        return filename

    def reload(self):
        self._load_templates()
