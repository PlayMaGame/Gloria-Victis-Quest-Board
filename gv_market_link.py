import time, re, sys, ctypes, ctypes.wintypes
import win32clipboard, win32gui, win32process, win32api, win32con

POLL_MS = 200
GV_TITLE = 'Gloria Victis'
CLICK_X, CLICK_Y = 209, 291
COOLDOWN = 2

def clip_text():
    try:
        win32clipboard.OpenClipboard()
        try:
            d = win32clipboard.GetClipboardData(win32clipboard.CF_UNICODETEXT)
        except TypeError:
            d = ''
        win32clipboard.CloseClipboard()
        return d
    except:
        return ''

def owner_process():
    try:
        win32clipboard.OpenClipboard()
        hwnd = win32clipboard.GetClipboardOwner()
        win32clipboard.CloseClipboard()
        if not hwnd:
            return ''
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        if not pid:
            return ''
        k32 = ctypes.windll.kernel32
        h = k32.OpenProcess(0x1000, False, pid)
        if not h:
            return ''
        buf = ctypes.create_string_buffer(260)
        sz = ctypes.wintypes.DWORD(260)
        k32.QueryFullProcessImageNameA(h, 0, buf, ctypes.byref(sz))
        k32.CloseHandle(h)
        return buf.value.decode('utf-8').lower()
    except:
        return ''

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

def from_board():
    proc = owner_process()
    if not proc:
        return True
    browsers = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'opera.exe', 'brave.exe']
    return any(b in proc for b in browsers)

def find_gv():
    hwnd = win32gui.FindWindow(None, GV_TITLE)
    if hwnd:
        return hwnd
    results = []
    def cb(h, r):
        if win32gui.IsWindowVisible(h) and 'gloria' in win32gui.GetWindowText(h).lower():
            r.append(h)
        return True
    win32gui.EnumWindows(cb, results)
    return results[0] if results else None

def activate(hwnd):
    try:
        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        fore = win32gui.GetForegroundWindow()
        ftid, _ = win32process.GetWindowThreadProcessId(fore)
        ttid, _ = win32process.GetWindowThreadProcessId(hwnd)
        if ftid != ttid:
            win32process.AttachThreadInput(ftid, ttid, True)
        win32gui.SetForegroundWindow(hwnd)
        if ftid != ttid:
            win32process.AttachThreadInput(ftid, ttid, False)
        return True
    except:
        return False

def click(x, y):
    win32api.SetCursorPos((x, y))
    time.sleep(0.05)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, x, y, 0, 0)
    time.sleep(0.03)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, x, y, 0, 0)

def combo(mod, key):
    vks = {'ctrl': win32con.VK_CONTROL, 'shift': win32con.VK_SHIFT}
    vkk = {'a': 0x41, 'v': 0x56, 'end': win32con.VK_END,
           'delete': win32con.VK_DELETE, 'enter': win32con.VK_RETURN}
    vm = vks.get(mod.lower())
    vk = vkk.get(key.lower(), ord(key.upper())) if isinstance(key, str) else key
    if vm:
        win32api.keybd_event(vm, 0, 0, 0)
        time.sleep(0.02)
    if vk:
        win32api.keybd_event(vk, 0, 0, 0)
        time.sleep(0.05)
        win32api.keybd_event(vk, 0, win32con.KEYEVENTF_KEYUP, 0)
    if vm:
        time.sleep(0.02)
        win32api.keybd_event(vm, 0, win32con.KEYEVENTF_KEYUP, 0)

def paste(text):
    for _ in range(3):
        try:
            win32clipboard.OpenClipboard()
            win32clipboard.EmptyClipboard()
            win32clipboard.SetClipboardText(text, win32clipboard.CF_UNICODETEXT)
            win32clipboard.CloseClipboard()
            break
        except:
            time.sleep(0.1)
    combo('ctrl', 'v')

def search(item):
    print(f'Searching: {item}')
    hwnd = find_gv()
    if not hwnd:
        print('GV window not found')
        return
    if not activate(hwnd):
        print('Could not activate GV')
        return
    time.sleep(0.3)
    click(CLICK_X, CLICK_Y)
    time.sleep(0.15)
    combo('ctrl', 'a')
    time.sleep(0.05)
    combo('shift', 'end')
    time.sleep(0.05)
    win32api.keybd_event(win32con.VK_DELETE, 0, 0, 0)
    time.sleep(0.02)
    win32api.keybd_event(win32con.VK_DELETE, 0, win32con.KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)
    paste(item)
    time.sleep(0.15)
    win32api.keybd_event(win32con.VK_RETURN, 0, 0, 0)
    time.sleep(0.02)
    win32api.keybd_event(win32con.VK_RETURN, 0, win32con.KEYEVENTF_KEYUP, 0)
    print(f'Done: {item}')

def main():
    print('GV Market Link — running')
    print('Copy an item name from the requisition board and this will auto-search in GV.')
    print('Press Ctrl+C to stop.\n')
    last, last_t = '', 0
    while True:
        try:
            c = clip_text()
            if c and c != last:
                last = c
                now = time.time()
                if now - last_t > COOLDOWN and is_item(c) and from_board():
                    last_t = now
                    search(c)
        except:
            pass
        time.sleep(POLL_MS / 1000)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nStopped.')
