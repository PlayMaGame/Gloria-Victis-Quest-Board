#Requires AutoHotkey v2.0
#SingleInstance Force
SendMode "Input"
SetKeyDelay -1, -1
ProcessSetPriority "High"
DllCall("winmm\timeBeginPeriod", "UInt", 1)

; Make timer callbacks (almost) un-preemptible
Thread "Interrupt", 0, 0
Thread "Priority", 1

F8::SoundBeep(1000, 40)

A_MaxHotkeysPerInterval := 1000000
A_HotkeyInterval        := 1000
A_MaxThreadsPerHotkey   := 2

; ---------- High-resolution clock ----------
global QPC_FREQ := 0
DllCall("QueryPerformanceFrequency", "Int64*", &__f := 0)
QPC_FREQ := __f

QPC() {                       ; milliseconds, double precision
    global QPC_FREQ
    DllCall("QueryPerformanceCounter", "Int64*", &c := 0)
    return (c * 1000.0) / QPC_FREQ
}

; ---------- Per-button cancel delays (ms) ----------
global S_DELAY := Map(
    "LButton",  610.21,
    "RButton",  609.5,
    "XButton1", 800.0,
    "XButton2", 721.1  ; overhead
)

global SPhysicallyHeld := false
global SIsDown         := false
global HeldCount       := 0
global CancelArmed     := false
global CancelTarget    := 0.0    ; absolute QPC ms when we should re-press
global LastPress       := 0.0
global MIN_GAP         := 30.0

; Spin the last N ms in a tight QPC loop to beat timer jitter.
global SPIN_MS         := 3.0    ; raise to 3 if you still see late fires

; ---------- Beep throttling ----------
global LastBeep        := 0.0
global BEEP_COOLDOWN   := 250
global BEEP_FREQ       := 1000
global BEEP_DUR        := 40

; ---------- S ownership (scan code for reliability) ----------
$s::{
    global SPhysicallyHeld, SIsDown
    if SPhysicallyHeld
        return
    SPhysicallyHeld := true
    SendInput "{Blind}{sc1F down}"
    SIsDown := true
}

$s up::{
    global SPhysicallyHeld, SIsDown, CancelArmed
    SPhysicallyHeld := false
    CancelArmed := false
    SetTimer(ResendS, 0)
    if SIsDown {
        SendInput "{Blind}{sc1F up}"
        SIsDown := false
    }
}

; ---------- Mouse ----------
~LButton::OnPress("LButton")
~RButton::OnPress("RButton")
~XButton1::OnPress("XButton1")
~XButton2::OnPress("XButton2")

~LButton Up::OnRelease()
~RButton Up::OnRelease()
~XButton1 Up::OnRelease()
~XButton2 Up::OnRelease()

OnPress(btn) {
    global HeldCount, SIsDown, SPhysicallyHeld, CancelArmed
    global S_DELAY, LastPress, MIN_GAP, CancelTarget, SPIN_MS

    now := QPC()
    if (now - LastPress < MIN_GAP) {
        WarnTooFast()
        return
    }
    LastPress := now
    HeldCount += 1

    if SIsDown {
        SendInput "{Blind}{sc1F up}"
        SIsDown := false
    }

    if (SPhysicallyHeld && !CancelArmed) {
        CancelArmed  := true
        ; Anchor to the *press* moment, not the timer-fire moment
        CancelTarget := now + S_DELAY[btn]
        ; Schedule the timer slightly early; we'll spin the rest
        wait := S_DELAY[btn] - SPIN_MS
        if (wait < 1)
            wait := 1
        SetTimer(ResendS, -Round(wait))
    }
}

OnRelease() {
    global HeldCount
    HeldCount -= 1
    if (HeldCount < 0)
        HeldCount := 0
}

ResendS() {
    global SPhysicallyHeld, SIsDown, CancelArmed, CancelTarget
    ; Tight spin for the final couple of ms — eliminates SetTimer jitter
    while (QPC() < CancelTarget) {
        ; no-op
    }
    CancelArmed := false
    if (SPhysicallyHeld && !SIsDown) {
        SendInput "{Blind}{sc1F down}"
        SIsDown := true
    }
}

WarnTooFast() {
    global LastBeep, BEEP_COOLDOWN, BEEP_FREQ, BEEP_DUR
    now := QPC()
    if (now - LastBeep < BEEP_COOLDOWN)
        return
    LastBeep := now
    SetTimer(() => SoundBeep(BEEP_FREQ, BEEP_DUR), -1)
}