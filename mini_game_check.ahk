cooldown := 0

SetTimer(CheckMiniGame, 10)

CheckMiniGame() {
    global cooldown
    if (A_TickCount < cooldown)
        return

    result := ImageSearch(&FoundX, &FoundY, 1136, 1177, 1419, 1208, "*45 " A_ScriptDir "\mini_game.png")
    if (result = 0)
    {
        Send "e"
        delay := Random(100, 150)
        cooldown := A_TickCount + delay
  eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee  }
}
