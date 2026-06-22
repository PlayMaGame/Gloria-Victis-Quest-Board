#Requires AutoHotkey v2.0
#SingleInstance Force
SendMode("Event")
SetWorkingDir(A_ScriptDir)

; ============================================================
; CONFIG — edit these to match your game setup
; ============================================================
GAME_TITLE    := "Gloria Victis"
SEARCH_X      := 129       ; screen X of market search field
SEARCH_Y      := 284       ; screen Y of market search field
OVERLAY_W     := 220
ITEMS_FILE    := "market_items.txt"

; Position on screen
OVERLAY_X    := ""         ; leave empty for auto top-right
OVERLAY_Y    := 15

; ============================================================
; GLOBALS
; ============================================================
Items       := []   ; item name strings
ItemCtrls   := []   ; corresponding Text controls
Overlay     := ""
st          := ""
SelIndex    := 0    ; 1-based, 0 = nothing selected
GuiHwnd     := 0
TITLE_H     := 28
ITEM_H      := 22

; ============================================================
; LOAD ITEMS
; ============================================================
LoadItems() {
    global Items
    Items := []
    if !FileExist(ITEMS_FILE) {
        data := "Flowering Plant`nBundle of Flax`nHerb Leaf`nHerbs`nRoot`nLemon Balm`nMoonshine"
        FileAppend(data, ITEMS_FILE)
    }
    Loop Read ITEMS_FILE {
        line := Trim(A_LoopReadLine)
        if line != ""
            Items.Push(line)
    }
}

; ============================================================
; BUILD OVERLAY
; ============================================================
BuildOverlay() {
    global Overlay, ItemCtrls, st, GuiHwnd, Items
    global OVERLAY_W, TITLE_H, ITEM_H, SelIndex, OVERLAY_X, OVERLAY_Y

    Overlay := Gui("+AlwaysOnTop +ToolWindow -Caption +E0x08000000")
    GuiHwnd := Overlay.Hwnd
    Overlay.BackColor := "0x1A1610"
    Overlay.SetFont("s9 cE8DFC0", "Segoe UI")
    Overlay.MarginX := 0
    Overlay.MarginY := 0

    ; -- Title bar --
    tb := Overlay.Add("Text", "x0 y0 w" OVERLAY_W " h" TITLE_H " Background0x221E15 0x200", "  ☰ Market Assistant")
    tb.SetFont("s10 cC8922A", "Segoe UI")

    ; -- Items --
    y := TITLE_H + 2
    ItemCtrls := []
    for name in Items {
        ctrl := Overlay.Add("Text", "x4 y" y " w" OVERLAY_W-8 " h" ITEM_H " 0x200", "  " name)
        ctrl.SetFont("s9 cE8DFC0", "Segoe UI")
        ItemCtrls.Push(ctrl)
        y += ITEM_H
    }

    ; -- Footer --
    y += 4
    st := Overlay.Add("Text", "x0 y" y " w" OVERLAY_W " h18 Background0x221E15 0x200 Center", "Ctrl+↑↓  Ctrl+↲ Search")
    st.SetFont("s8 c5A5030", "Segoe UI")

    WinH := y + 20

    ; Select first item
    SelIndex := Items.Length > 0 ? 1 : 0
    UpdateHighlight()

    ; Show at top-right
    posX := OVERLAY_X != "" ? OVERLAY_X : A_ScreenWidth - OVERLAY_W - 15
    Overlay.Show("x" posX " y" OVERLAY_Y " w" OVERLAY_W " h" WinH)

    ; Make overlay click-through, except title bar for dragging
    OnMessage(0x0084, HitTest)
}

HitTest(wParam, lParam, msg, hwnd) {
    global GuiHwnd, TITLE_H
    if (hwnd != GuiHwnd)
        return
    ; Screen coords from lParam (low word = X, high word = Y)
    x := lParam & 0xFFFF
    y := (lParam >> 16) & 0xFFFF
    ; Convert to client coords
    WinGetPos(&wX, &wY,,, "ahk_id " GuiHwnd)
    rx := x - wX
    ry := y - wY
    ; Title bar → draggable (HTCAPTION = 2)
    if (ry >= 0 && ry < TITLE_H)
        return 2
    ; Everything else → click-through (HTTRANSPARENT = -1)
    return -1
}

; ============================================================
; HIGHLIGHT
; ============================================================
UpdateHighlight() {
    global ItemCtrls, SelIndex
    bgSel := "0x3C3018"
    bgDef := "0x1A1610"
    for idx, ctrl in ItemCtrls {
        ctrl.Opt("Background" (idx == SelIndex ? bgSel : bgDef))
    }
}

; ============================================================
; SEARCH
; ============================================================
DoSearch(*) {
    global Overlay, Items, SelIndex, st
    global GAME_TITLE, SEARCH_X, SEARCH_Y

    if (SelIndex < 1 || SelIndex > Items.Length)
        return

    item := Items[SelIndex]

    if !WinExist(GAME_TITLE) {
        st.Text := "Window '" GAME_TITLE "' not found"
        SetTimer(RestoreFooter, -2000)
        return
    }

    ClipSaved := ClipboardAll()
    A_Clipboard := ""
    A_Clipboard := item
    if !ClipWait(0.5) {
        SetTimer(RestoreFooter, -1500)
        return
    }

    st.Text := "→ " item
    Overlay.Hide()
    Sleep(40)

    Click(SEARCH_X, SEARCH_Y)
    Sleep(80)
    Send("^v")
    Sleep(200)
    Send("{Enter}")

    Sleep(400)
    Overlay.Show()
    A_Clipboard := ClipSaved

    st.Text := "✓ " item
    SetTimer(RestoreFooter, -2500)
}

RestoreFooter() {
    global st
    st.Text := "Ctrl+↑↓  Ctrl+↲ Search"
}

; ============================================================
; INIT
; ============================================================
LoadItems()
BuildOverlay()

; ============================================================
; HOTKEYS
; ============================================================

; --- Navigation ---
~^Up:: {
    global Items, SelIndex
    if (Items.Length = 0)
        return
    SelIndex := SelIndex > 1 ? SelIndex - 1 : Items.Length
    UpdateHighlight()
}

~^Down:: {
    global Items, SelIndex
    if (Items.Length = 0)
        return
    SelIndex := SelIndex < Items.Length ? SelIndex + 1 : 1
    UpdateHighlight()
}

; --- Search ---
~^Enter:: DoSearch()

; --- Reload items ---
~F5:: {
    global Items, ItemCtrls, Overlay, SelIndex, st
    global TITLE_H, ITEM_H, OVERLAY_W
    LoadItems()
    for ctrl in ItemCtrls
        ctrl.Destroy()
    ItemCtrls := []
    y := TITLE_H + 2
    for name in Items {
        ctrl := Overlay.Add("Text", "x4 y" y " w" OVERLAY_W-8 " h" ITEM_H " 0x200", "  " name)
        ctrl.SetFont("s9 cE8DFC0", "Segoe UI")
        ItemCtrls.Push(ctrl)
        y += ITEM_H
    }
    SelIndex := Items.Length > 0 ? 1 : 0
    UpdateHighlight()
    Overlay.Show("w" OVERLAY_W " h" y + 42)
    st.Text := Items.Length " items"
    SetTimer(RestoreFooter, -2000)
}

; --- Toggle visibility ---
~Pause:: {
    global GuiHwnd
    if DllCall("IsWindowVisible", "Ptr", GuiHwnd)
        WinHide("ahk_id " GuiHwnd)
    else {
        WinShow("ahk_id " GuiHwnd)
        WinSetAlwaysOnTop(1, "ahk_id " GuiHwnd)
    }
}

; --- Exit ---
~^q::ExitApp()
