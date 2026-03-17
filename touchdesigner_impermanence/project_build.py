"""
TouchDesigner Network Builder
=============================
Run this script inside TouchDesigner's textport (Alt+T) or as a startup script
to auto-construct the full "Impermanence of Image" network.

It creates all operators, wires them together, sets parameters, and loads
the external Python/GLSL scripts from the project folder.

Usage in TouchDesigner:
    1. Open a new project
    2. Open Textport (Alt+T)
    3. Run:  exec(open('/path/to/project_build.py').read())
"""

import os

# ---------------------------------------------------------------------------
# Configuration — adjust this to your local project path
# ---------------------------------------------------------------------------
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, "scripts")
SHADERS_DIR = os.path.join(PROJECT_DIR, "shaders")

# Resolution
RES_X = 1920
RES_Y = 1080


def build_network(parent=None):
    """Build the entire TouchDesigner network."""
    if parent is None:
        parent = op("/project1")

    # Clean slate
    for c in parent.children:
        c.destroy()

    # =======================================================================
    # 1. INPUT STAGE — Camera or File
    # =======================================================================
    video_in = parent.create(videodevinTOP, "video_in")
    video_in.par.active = True
    video_in.nodeX = -600
    video_in.nodeY = 300

    file_in = parent.create(moviefileinTOP, "file_in")
    file_in.par.file = os.path.join(PROJECT_DIR, "assets", "source_image.jpg")
    file_in.nodeX = -600
    file_in.nodeY = 100

    # Switch between camera and file input (par.index 0=camera, 1=file)
    input_switch = parent.create(switchTOP, "input_switch")
    input_switch.par.index = 0
    input_switch.nodeX = -400
    input_switch.nodeY = 200
    video_in.outputConnectors[0].connect(input_switch.inputConnectors[0])
    file_in.outputConnectors[0].connect(input_switch.inputConnectors[1])

    # Resize to working resolution
    res_top = parent.create(resolutionTOP, "resolution1")
    res_top.par.resolutionw = RES_X
    res_top.par.resolutionh = RES_Y
    res_top.par.outputresolution = "useinput"
    res_top.nodeX = -200
    res_top.nodeY = 200
    input_switch.outputConnectors[0].connect(res_top.inputConnectors[0])

    # =======================================================================
    # 2. AURA CAPTURE — Freeze the "original" for reference
    # =======================================================================
    cache_original = parent.create(cacheTOP, "aura_original")
    cache_original.par.cachepulse.pulse()
    cache_original.nodeX = 0
    cache_original.nodeY = 400
    res_top.outputConnectors[0].connect(cache_original.inputConnectors[0])

    # =======================================================================
    # 3. DECAY ENGINE — Feedback loop (the core of impermanence)
    # =======================================================================
    feedback = parent.create(feedbackTOP, "decay_feedback")
    feedback.nodeX = 200
    feedback.nodeY = 200

    # -----------------------------------------------------------------------
    # SHADER BANK — Four dissolution modes, switchable at runtime
    # -----------------------------------------------------------------------
    # Each shader receives the same inputs (source + feedback) and produces
    # the same output format. A Switch TOP selects which is active.

    shader_names = [
        ("aura_dissolve",   "aura_dissolve.frag",   "Organic dissolution — memory fading"),
        ("generation_loss", "generation_loss.frag",  "JPEG recompression — reproduction as degradation"),
        ("halftone_print",  "halftone_print.frag",   "Mechanical print — dots, ink, paper"),
        ("datamosh",        "datamosh.frag",         "Corrupted video — displaced history"),
    ]

    # Shared uniforms driven by the decay controller Script CHOP
    uniform_names = [
        "uDecayFactor", "uNoiseAmp", "uContrastLoss",
        "uColorDrift", "uGhostOpacity", "uAuraRemaining", "uTime",
    ]

    glsl_tops = []
    for i, (name, frag_file, description) in enumerate(shader_names):
        glsl = parent.create(glslTOP, name)
        glsl.par.resolutionw = RES_X
        glsl.par.resolutionh = RES_Y
        glsl.par.outputresolution = "specified"
        glsl.par.pixeldat = os.path.join(SHADERS_DIR, frag_file)
        glsl.nodeX = 200
        glsl.nodeY = -120 * i
        glsl.comment = description

        # Wire source + feedback into every shader
        res_top.outputConnectors[0].connect(glsl.inputConnectors[0])
        feedback.outputConnectors[0].connect(glsl.inputConnectors[1])

        glsl_tops.append(glsl)

    # Switch TOP to select active shader (keys 5-8, or custom parameter)
    shader_switch = parent.create(switchTOP, "shader_switch")
    shader_switch.par.index = 0  # Default: aura_dissolve
    shader_switch.nodeX = 400
    shader_switch.nodeY = -60
    shader_switch.comment = "5=Aura 6=JPEG 7=Print 8=Datamosh"

    for glsl in glsl_tops:
        glsl.outputConnectors[0].connect(shader_switch)

    # For backward compatibility, alias the selected output
    glsl_top = shader_switch

    # =======================================================================
    # 4. REPRODUCTION ENGINE — Mechanical copies that degrade
    # =======================================================================
    # Tile/mirror to represent mechanical reproduction
    tile_top = parent.create(tileTOP, "reproduction_tile")
    tile_top.par.reps = 1
    tile_top.par.repst = 1
    tile_top.nodeX = 400
    tile_top.nodeY = 0

    glsl_top.outputConnectors[0].connect(tile_top.inputConnectors[0])

    # Level adjustment — each reproduction loses contrast/fidelity
    level_top = parent.create(levelTOP, "fidelity_loss")
    level_top.par.opacity = 0.98
    level_top.par.contrast = 0.995
    level_top.par.brightness1 = 0.001
    level_top.nodeX = 600
    level_top.nodeY = 0

    tile_top.outputConnectors[0].connect(level_top.inputConnectors[0])

    # Noise overlay — entropy creeping in
    noise_top = parent.create(noiseTOP, "entropy_noise")
    noise_top.par.resolutionw = RES_X
    noise_top.par.resolutionh = RES_Y
    noise_top.par.outputresolution = "specified"
    noise_top.par.amp = 0.02
    noise_top.nodeX = 600
    noise_top.nodeY = -200

    # Composite noise over the degraded image
    comp_top = parent.create(compositeTOP, "entropy_composite")
    comp_top.par.operand = "add"
    comp_top.nodeX = 800
    comp_top.nodeY = 0

    level_top.outputConnectors[0].connect(comp_top.inputConnectors[0])
    noise_top.outputConnectors[0].connect(comp_top.inputConnectors[1])

    # Close the feedback loop
    comp_top.outputConnectors[0].connect(feedback.inputConnectors[0])

    # =======================================================================
    # 5. TEMPORAL LAYERING — Ghost images from the past
    # =======================================================================
    delay_top = parent.create(delayTOP, "temporal_ghost")
    delay_top.par.length = 30  # 30 frame delay
    delay_top.nodeX = 1000
    delay_top.nodeY = 200

    comp_top.outputConnectors[0].connect(delay_top.inputConnectors[0])

    # Blend current with ghost (past haunting present)
    ghost_blend = parent.create(compositeTOP, "ghost_blend")
    ghost_blend.par.operand = "over"
    ghost_blend.nodeX = 1200
    ghost_blend.nodeY = 0

    comp_top.outputConnectors[0].connect(ghost_blend.inputConnectors[0])
    delay_top.outputConnectors[0].connect(ghost_blend.inputConnectors[1])

    # =======================================================================
    # 6. TIMELINE / ERASURE CHOP SYSTEM
    # =======================================================================
    timer_chop = parent.create(timerCHOP, "erasure_timer")
    timer_chop.par.length = 300  # 5 minutes to full dissolution
    timer_chop.par.lengthunits = "seconds"
    timer_chop.nodeX = 200
    timer_chop.nodeY = -400

    # LFO for oscillating decay parameters
    lfo_chop = parent.create(lfoCHOP, "decay_lfo")
    lfo_chop.par.frequency = 0.03
    lfo_chop.par.amplitude = 1
    lfo_chop.nodeX = 200
    lfo_chop.nodeY = -550

    # Math CHOP to shape the timer into decay curves
    math_chop = parent.create(mathCHOP, "decay_curve")
    math_chop.par.gain = 1
    math_chop.par.postoff = 0
    math_chop.nodeX = 400
    math_chop.nodeY = -400

    timer_chop.outputConnectors[0].connect(math_chop.inputConnectors[0])

    # =======================================================================
    # 7. PYTHON DECAY CONTROLLER (Script CHOP)
    # =======================================================================
    script_chop = parent.create(scriptCHOP, "decay_controller")
    script_chop.par.callbacks = os.path.join(SCRIPTS_DIR, "decay_engine.py")
    script_chop.nodeX = 600
    script_chop.nodeY = -400

    # =======================================================================
    # 8. REPRODUCTION GRID — Multiple copies shown simultaneously
    # =======================================================================
    repo_grid = parent.create(replicatorCOMP, "reproduction_grid")
    repo_grid.nodeX = 1400
    repo_grid.nodeY = 200

    # =======================================================================
    # 9. OUTPUT
    # =======================================================================
    null_out = parent.create(nullTOP, "final_output")
    null_out.nodeX = 1400
    null_out.nodeY = 0
    ghost_blend.outputConnectors[0].connect(null_out.inputConnectors[0])

    out_top = parent.create(outTOP, "out1")
    out_top.nodeX = 1600
    out_top.nodeY = 0
    null_out.outputConnectors[0].connect(out_top.inputConnectors[0])

    # =======================================================================
    # 10. UI CONTROLS
    # =======================================================================
    container = parent.create(containerCOMP, "controls_ui")
    container.nodeX = 0
    container.nodeY = -600

    print("[Impermanence] Network built successfully.")
    print("[Impermanence] Press 'C' to capture aura, 'R' to reset, 'Space' to pause decay.")
    return parent


# Run if executed directly
if __name__ != "__main__":
    # Inside TouchDesigner
    try:
        build_network()
    except Exception as e:
        print(f"[Impermanence] Build error: {e}")
        print("[Impermanence] Run this script inside TouchDesigner's Textport.")
