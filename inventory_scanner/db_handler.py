import json
from datetime import datetime
from pathlib import Path


class DBHandler:
    def __init__(self, db_path="inventory_db.json"):
        self.db_path = Path(db_path)
        self.data = self._load()

    def _load(self):
        if self.db_path.exists():
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"items": {}, "scan_log": []}

    def save(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def get_item(self, item_id):
        return self.data["items"].get(item_id)

    def add_item(self, item_id, template_filename, unidentified=True):
        now = datetime.now().isoformat()
        self.data["items"][item_id] = {
            "template": template_filename,
            "names": {"en": None, "ru": None},
            "unidentified": unidentified,
            "first_seen": now,
            "last_seen": now,
            "history": [],
        }
        self.save()

    def record_scan(self, item_id, amount, slot_index):
        now = datetime.now().isoformat()
        item = self.data["items"].get(item_id)
        if item is None:
            return False
        item["last_seen"] = now
        item["history"].append({
            "timestamp": now,
            "amount": amount,
            "slot": slot_index,
        })
        self.save()
        return True

    def log_scan(self, scan_data):
        self.data["scan_log"].append(scan_data)
        self.save()

    def name_item(self, item_id, name_en, name_ru):
        item = self.data["items"].get(item_id)
        if item is None:
            return False
        item["names"]["en"] = name_en
        item["names"]["ru"] = name_ru
        item["unidentified"] = False
        self.save()
        return True

    def get_unidentified(self):
        return {k: v for k, v in self.data["items"].items()
                if v.get("unidentified", True)}

    def get_all_items(self):
        return dict(self.data["items"])
