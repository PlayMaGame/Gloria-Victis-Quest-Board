import os, sys, time, re

try:
    import pyautogui
except ImportError:
    print('pyautogui not installed. Run: pip install pyautogui')
    sys.exit(1)

try:
    import pyperclip
except ImportError:
    print('pyperclip not installed. Run: pip install pyperclip')
    sys.exit(1)

try:
    import pygetwindow as gw
except ImportError:
    print('pygetwindow not installed. Run: pip install pygetwindow')
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
COORDS_FILE = os.path.join(HERE, 'market_coords.txt')
SEARCH_IMG = os.path.join(HERE, 'search.jpg')
OFFSET_X = -50
POLL = 0.2
COOLDOWN = 2

pyautogui.FAILSAFE = True

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
        try:
            active = gw.getActiveWindow()
            if active and 'gloria' in active.title.lower():
                return True
        except:
            pass
        time.sleep(1)

def calibrate():
    print('=== Calibration ===')
    print('Switch to Gloria Victis and open the market tab.')
    print('The script will detect when GV is in focus and scan automatically.\n')
    wait_gv_focused()
    print('GV detected! Scanning for search.jpg...')
    time.sleep(0.5)
    pos = locate_search_box()
    for _ in range(3):
        if pos:
            break
        time.sleep(2)
        pos = locate_search_box()
    if not pos:
        print('Could not find search.jpg on screen.')
        print('Make sure the market tab is open and search.jpg matches the search bar area.')
        print('Try taking a new screenshot of the search field and saving it as search.jpg')
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

def activate_gv():
    wins = gw.getWindowsWithTitle('Gloria Victis')
    if not wins:
        all_wins = gw.getAllWindows()
        wins = [w for w in all_wins if w.title and 'gloria' in w.title.lower()]
    if not wins:
        return None
    win = wins[0]
    try:
        w32 = gw._pygetwindow_win.win32gui
        w32p = gw._pygetwindow_win.win32process
        w32c = gw._pygetwindow_win.win32con
        hwnd = win._hWnd
        if w32.IsIconic(hwnd):
            w32.ShowWindow(hwnd, w32c.SW_RESTORE)
        fore = w32.GetForegroundWindow()
        ftid, _ = w32p.GetWindowThreadProcessId(fore)
        ttid, _ = w32p.GetWindowThreadProcessId(hwnd)
        if ftid != ttid:
            w32p.AttachThreadInput(ftid, ttid, True)
        w32.SetForegroundWindow(hwnd)
        w32.BringWindowToTop(hwnd)
        if ftid != ttid:
            w32p.AttachThreadInput(ftid, ttid, False)
        return hwnd
    except:
        return None

def search(name, pos):
    x, y = pos
    print(f'Search: {name}')
    if not activate_gv():
        print('Could not activate GV')
        return
    time.sleep(0.6)
    pyautogui.click(x, y)
    time.sleep(0.15)
    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.08)
    pyautogui.hotkey('shift', 'end')
    time.sleep(0.08)
    pyautogui.press('delete')
    time.sleep(0.08)
    pyperclip.copy(name)
    time.sleep(0.05)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.2)
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
    last, last_t = '', 0
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
