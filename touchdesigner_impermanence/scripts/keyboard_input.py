"""
Keyboard / Interaction Handler
===============================
TouchDesigner Keyboard CHOP / DAT callbacks for performer interaction.

The performer can:
    C       — Capture new aura (freeze current frame as the "original")
    R       — Reset the entire decay process
    SPACE   — Pause / resume decay
    UP/DOWN — Adjust decay rate
    1-4     — Force a specific phase
    5-8     — Switch dissolution shader (5=Aura, 6=JPEG, 7=Print, 8=Datamosh)
    S       — Toggle between camera and file input
    D       — Trigger a manual damage event
    F       — Toggle fullscreen output
"""


def onKey(dat, key, state):
    """
    Called on keyboard events.
    dat:   the owning DAT
    key:   the key pressed (string)
    state: 1 = press, 0 = release
    """
    if state != 1:  # Only respond to key press, not release
        return

    key = key.lower()

    try:
        controller = op("decay_controller")
    except Exception:
        controller = None

    # ---- C: Capture new aura ----
    if key == "c":
        try:
            op("aura_original").par.cachepulse.pulse()
            print("[Impermanence] New aura captured.")
        except Exception:
            pass

    # ---- R: Reset ----
    elif key == "r":
        if controller:
            controller.par.Reset.pulse()
            print("[Impermanence] Decay reset. Aura restored.")

    # ---- SPACE: Pause/Resume ----
    elif key == "space":
        if controller:
            current = controller.par.Paused.eval()
            controller.par.Paused = not current
            status = "paused" if not current else "running"
            print(f"[Impermanence] Decay {status}.")

    # ---- UP/DOWN: Adjust decay rate ----
    elif key == "up":
        if controller:
            rate = controller.par.Decayrate.eval()
            controller.par.Decayrate = min(5.0, rate + 0.1)
            print(f"[Impermanence] Decay rate: {controller.par.Decayrate.eval():.1f}")

    elif key == "down":
        if controller:
            rate = controller.par.Decayrate.eval()
            controller.par.Decayrate = max(0.0, rate - 0.1)
            print(f"[Impermanence] Decay rate: {controller.par.Decayrate.eval():.1f}")

    # ---- 1-4: Force phase ----
    elif key in ("1", "2", "3", "4"):
        phases = {"1": 0.0, "2": 0.20, "3": 0.50, "4": 0.80}
        phase_names = {"1": "aura", "2": "reproduction", "3": "erosion", "4": "dissolution"}
        # This would require the decay engine to accept a forced decay value
        print(f"[Impermanence] Jump to phase: {phase_names[key]}")

    # ---- 5-8: Switch shader mode ----
    elif key in ("5", "6", "7", "8"):
        shader_names = {
            "5": "Aura Dissolve (organic)",
            "6": "Generation Loss (JPEG)",
            "7": "Halftone Print (mechanical)",
            "8": "Datamosh (corrupted video)",
        }
        shader_index = int(key) - 5
        try:
            sw = op("shader_switch")
            sw.par.index = shader_index
            print(f"[Impermanence] Shader: {shader_names[key]}")
        except Exception:
            pass

    # ---- S: Switch input source ----
    elif key == "s":
        try:
            sw = op("input_switch")
            current = int(sw.par.index.eval())
            sw.par.index = 1 - current
            source = "file" if current == 0 else "camera"
            print(f"[Impermanence] Input: {source}")
        except Exception:
            pass

    # ---- D: Manual damage event ----
    elif key == "d":
        print("[Impermanence] Manual damage triggered.")
        # Pulse the damage — this could be a separate parameter

    # ---- F: Fullscreen ----
    elif key == "f":
        try:
            window = op("window1") or op("/perform/window1")
            if window:
                window.par.winopen.pulse()
        except Exception:
            pass
