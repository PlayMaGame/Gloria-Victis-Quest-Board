#Persistent

cooldown := 0

SetTimer, CheckMiniGame, 10

CheckMiniGame:
WinGetPos, WinX, WinY, WinW, WinH, ahk_exe gv.exe
if (WinX = "")
    return

if (WinX < 0)
{
    WinX := 0
    WinY := 0
}

if (A_TickCount < cooldown)
    return

ImageSearch, FoundX, FoundY, % WinX+1136, % WinY+1177, % WinX+1419, % WinY+1208, *5 %A_ScriptDir%\mini_game.png
if (ErrorLevel = 0)
{
    Send, e
    Random, delay, 100, 150
    cooldown := A_TickCount + delay
}
return
