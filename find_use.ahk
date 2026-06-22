#Persistent

F7::
tolerance := 0
found := false

Loop
{
    ImageSearch, FoundX, FoundY, 0, 0, A_ScreenWidth, A_ScreenHeight, *%tolerance% %A_ScriptDir%\use.png
    if (ErrorLevel = 0)
    {
        found := true
        break
    }
    else if (ErrorLevel = 2)
    {
        MsgBox, Could not perform the image search.
        return
    }

    tolerance += 10
    if (tolerance > 250)
    {
        MsgBox, Image not found even at tolerance 250.
        return
    }
}

MsgBox, Found at X:%FoundX% Y:%FoundY% (tolerance: %tolerance%)
Clipboard := FoundX "," FoundY
return
