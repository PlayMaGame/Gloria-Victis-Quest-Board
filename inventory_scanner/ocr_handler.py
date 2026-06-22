import re

import cv2
import numpy as np
import pytesseract


class OCRHandler:
    def __init__(self, tesseract_cmd=None, psm=7,
                 whitelist="0123456789"):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        self.psm = psm
        self.whitelist = whitelist

    def read_stack_amount(self, slot_img):
        h, w = slot_img.shape[:2]
        # Crop bottom-right area where stack count usually appears
        crop = slot_img[int(h * 0.60):h, int(w * 0.40):w]
        if crop.size == 0:
            return 1

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255,
                                  cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        if np.mean(thresh) > 127:
            thresh = cv2.bitwise_not(thresh)

        thresh = cv2.resize(thresh, None, fx=2, fy=2,
                            interpolation=cv2.INTER_CUBIC)

        config = (f"--psm {self.psm} "
                  f"-c tessedit_char_whitelist={self.whitelist}")
        text = pytesseract.image_to_string(thresh, config=config).strip()
        text = re.sub(r"[^0-9]", "", text)

        if text:
            return int(text)
        return 1
