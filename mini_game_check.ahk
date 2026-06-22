#Persistent

cooldown := 0

SetTimer, CheckMiniGame, 10

CheckMiniGame:
if (A_TickCount < cooldown)
    return

ImageSearch, FoundX, FoundY, 1124, 1177, 1422, 1206, *45 %A_ScriptDir%\mini_game.png
if (ErrorLevel = 0)
{
    Send, e
    Random, delay, 100, 150
    cooldown := A_TickCount + delay
}
return
