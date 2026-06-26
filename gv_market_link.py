import os, sys, time, re

try:
    import pyautogui
except ImportError:
    print('pyautogui not installed. Run: pip install pyautogui')
    sys.exit(1)

try:
    import pydirectinput
except ImportError:
    print('pydirectinput not installed. Run: pip install pydirectinput')
    sys.exit(1)

try:
    import pyperclip
except ImportError:
    print('pyperclip not installed. Run: pip install pyperclip')
    sys.exit(1)

try:
    import win32api, win32gui, win32process, win32con
except ImportError:
    print('pywin32 not installed. Run: pip install pywin32')
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
COORDS_FILE = os.path.join(HERE, 'market_coords.txt')
SEARCH_IMG = os.path.join(HERE, 'search.jpg')
OFFSET_X = -50
POLL = 0.2
COOLDOWN = 2

def load():
    if not os.path.exists(COORDS_FILE):
        return None
    try:
        with open(COORDS_FILE) as f:
            parts = f.read().strip().split(',')
            return int(parts[0]), int(parts[1])
    except:
        return None

def save(x, y):
    with open(COORDS_FILE, 'w') as f:
        f.write(f'{x},{y}')

def locate_search_box():
    try:
        box = pyautogui.locateOnScreen(SEARCH_IMG, grayscale=True, confidence=0.8)
        if not box:
            box = pyautogui.locateOnScreen(SEARCH_IMG, grayscale=True)
    except:
        try:
            box = pyautogui.locateOnScreen(SEARCH_IMG, grayscale=True)
        except:
            return None
    if not box:
        return None
    cx, cy = pyautogui.center(box)
    return int(cx + OFFSET_X), int(cy)

def wait_gv_focused():
    print('Waiting for Gloria Victis to be in focus...')
    while True:
        hwnd = win32gui.GetForegroundWindow()
        title = win32gui.GetWindowText(hwnd)
        if 'gloria' in title.lower():
            return
        time.sleep(1)

def calibrate():
    print('=== Calibration ===')
    print('Switch to Gloria Victis and open the market tab.')
    print('The script will detect when GV is in focus and scan automatically.\n')
    wait_gv_focused()
    print('GV detected! Scanning for search.jpg...')
    pos = locate_search_box()
    for _ in range(3):
        if pos:
            break
        time.sleep(2)
        pos = locate_search_box()
    if not pos:
        print('Could not find search.jpg on screen.')
        print('Make sure the market tab is open and search.jpg matches the search bar area.')
        return None
    print(f'Found search field at: {pos[0]}, {pos[1]}')
    return pos

def is_item(text):
    if not text or len(text) < 2 or len(text) > 100:
        return False
    if '\n' in text or '\r' in text:
        return False
    if re.search(r'https?://|www\.', text, re.IGNORECASE):
        return False
    if text.strip().isdigit():
        return False
    if not re.search(r'[a-zA-Z\u0400-\u04FF]', text):
        return False
    if '\\' in text and len(text) > 10:
        return False
    return True

def find_gv():
    hwnd = win32gui.FindWindow(None, 'Gloria Victis')
    if hwnd:
        return hwnd
    results = []
    def cb(h, r):
        if win32gui.IsWindowVisible(h) and 'gloria' in win32gui.GetWindowText(h).lower():
            r.append(h)
        return True
    win32gui.EnumWindows(cb, results)
    return results[0] if results else None

def activate_gv(hwnd):
    if win32gui.IsIconic(hwnd):
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
    fore = win32gui.GetForegroundWindow()
    ftid, _ = win32process.GetWindowThreadProcessId(fore)
    ttid, _ = win32process.GetWindowThreadProcessId(hwnd)
    if ftid != ttid:
        win32process.AttachThreadInput(ftid, ttid, True)
    win32gui.SetForegroundWindow(hwnd)
    win32gui.BringWindowToTop(hwnd)
    if ftid != ttid:
        win32process.AttachThreadInput(ftid, ttid, False)

def search(name, pos):
    x, y = pos
    print(f'Search: {name}')
    hwnd = find_gv()
    if not hwnd:
        print('GV window not found')
        return
    try:
        activate_gv(hwnd)
    except Exception as e:
        print(f'Could not activate GV: {e}')
        return
    pydirectinput.click(x, y)
    time.sleep(0.15)
    pydirectinput.keyDown('ctrl')
    pydirectinput.press('v')
    pydirectinput.keyUp('ctrl')
    time.sleep(0.05)
    pyautogui.press('enter')
    print(f'Done: {name}')

def main():
    print('=== GV Market Link ===')
    pos = load()
    if not pos:
        pos = calibrate()
        if not pos:
            input('\nPress Enter to exit.')
            return
        save(*pos)
    else:
        print(f'Loaded search position: {pos[0]}, {pos[1]}')
        print('To recalibrate, delete market_coords.txt and restart.')
    print('\nMonitoring clipboard... (Ctrl+C to stop)')
    print()
    last, last_t = pyperclip.paste(), 0
    try:
        while True:
            c = pyperclip.paste()
            if c and c != last:
                last = c
                now = time.time()
                if now - last_t > COOLDOWN and is_item(c):
                    last_t = now
                    search(c, pos)
            time.sleep(POLL)
    except KeyboardInterrupt:
        print('\nStopped.')

if __name__ == '__main__':
    main()
