"""
Reproduction System — Mechanical Copies
========================================
TouchDesigner Script TOP / Script SOP callbacks for generating
and managing multiple degraded copies of the source image.

Benjamin's thesis: "that which withers in the age of mechanical
reproduction is the aura of the work of art."

Each copy is progressively more degraded than the last. The spatial
arrangement shifts from orderly grid (early reproduction, like a
printing press) to chaotic scatter (late erosion, like oral history).

This script manages a Replicator COMP that spawns image copies,
each with its own degradation offset.
"""

import math
import random


# ---------------------------------------------------------------------------
# Layout strategies — how copies are arranged in space
# ---------------------------------------------------------------------------

def grid_layout(index, total, width, height, decay):
    """
    Early phase: orderly grid like a printed page.
    As decay increases, the grid wobbles and breaks down.
    """
    cols = max(1, int(math.ceil(math.sqrt(total))))
    rows = max(1, int(math.ceil(total / cols)))

    col = index % cols
    row = index // cols

    cell_w = width / cols
    cell_h = height / rows

    x = (col + 0.5) * cell_w - width / 2
    y = (row + 0.5) * cell_h - height / 2

    # Add wobble based on decay
    wobble = decay * 50.0
    x += random.gauss(0, wobble)
    y += random.gauss(0, wobble)

    # Scale decreases per copy (each reproduction is smaller)
    scale = max(0.1, 1.0 / cols - decay * 0.05)

    return x, y, scale


def spiral_layout(index, total, width, height, decay):
    """
    Mid phase: spiral arrangement — history repeating in cycles,
    each iteration further from the center/truth.
    """
    angle = index * 2.39996  # Golden angle in radians
    radius = 30.0 * math.sqrt(index + 1) * (1.0 + decay)

    x = math.cos(angle) * radius
    y = math.sin(angle) * radius

    # Scale diminishes with distance from center
    scale = max(0.05, 0.8 - index * 0.06 - decay * 0.1)

    return x, y, scale


def scatter_layout(index, total, width, height, decay):
    """
    Late phase: random scatter — complete loss of order,
    like fragments of a destroyed archive.
    """
    random.seed(index * 137 + int(decay * 10))

    x = random.uniform(-width / 2, width / 2)
    y = random.uniform(-height / 2, height / 2)

    scale = random.uniform(0.03, 0.3) * (1.0 - decay * 0.5)

    return x, y, scale


def get_layout(phase, index, total, width=1920, height=1080, decay=0.0):
    """Select layout strategy based on current phase."""
    layouts = {
        "aura": grid_layout,
        "reproduction": grid_layout,
        "erosion": spiral_layout,
        "dissolution": scatter_layout,
    }
    func = layouts.get(phase, grid_layout)
    return func(index, total, width, height, decay)


# ---------------------------------------------------------------------------
# Per-copy degradation parameters
# ---------------------------------------------------------------------------

def copy_degradation(index, total, base_decay):
    """
    Calculate how much additional degradation each copy receives.
    Later copies are more degraded — like a photocopy of a photocopy.

    Returns a dict of parameter offsets to apply to each copy's shader.
    """
    # Generation loss — exponential degradation per copy
    generation = index / max(1, total - 1)
    generation_loss = 1.0 - math.pow(0.92, index)

    combined_decay = min(1.0, base_decay + generation_loss * 0.3)

    return {
        "decay_offset": generation_loss * 0.2,
        "noise_offset": generation_loss * 0.05,
        "contrast_offset": generation_loss * 0.15,
        "color_offset": generation_loss * 0.1,
        "blur_offset": generation_loss * 2.0,
        "opacity": max(0.1, 1.0 - combined_decay * 0.6),
        "rotation": random.gauss(0, combined_decay * 15),  # degrees
    }


# ---------------------------------------------------------------------------
# TouchDesigner Replicator Callbacks
# ---------------------------------------------------------------------------

def onReplicate(comp, allOps, newOps, startPulse, startIndex, numOps):
    """
    Called when the Replicator creates new copies.
    Position and style each copy based on the current decay state.
    """
    # Read current state from the decay controller
    try:
        controller = op("decay_controller")
        decay = controller["decay_factor"].eval()
        phase_idx = int(controller["phase_index"].eval())
        phases = ["aura", "reproduction", "erosion", "dissolution"]
        phase = phases[phase_idx] if phase_idx < len(phases) else "aura"
        num_copies = int(controller["reproduction_n"].eval())
    except Exception:
        decay = 0.0
        phase = "aura"
        num_copies = 1

    total = len(allOps)

    for i, c in enumerate(allOps):
        # Get spatial layout
        x, y, scale = get_layout(phase, i, total, decay=decay)

        # Get per-copy degradation
        deg = copy_degradation(i, total, decay)

        # Apply transforms
        c.par.tx = x
        c.par.ty = y
        c.par.sx = scale
        c.par.sy = scale
        c.par.rz = deg["rotation"]

        # Pass degradation parameters to each copy's shader
        # (assumes each replicated template has custom parameters)
        try:
            c.par.Decayoffset = deg["decay_offset"]
            c.par.Noiseoffset = deg["noise_offset"]
            c.par.Opacity = deg["opacity"]
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Utility: generate copy table for Table CHOP/DAT driving the replicator
# ---------------------------------------------------------------------------

def generate_copy_table(num_copies, decay, phase):
    """
    Produce a table of parameters that can be fed to a Table DAT
    to drive a Replicator COMP.

    Returns list of dicts, one per copy.
    """
    copies = []
    for i in range(num_copies):
        x, y, scale = get_layout(phase, i, num_copies, decay=decay)
        deg = copy_degradation(i, num_copies, decay)

        copies.append({
            "index": i,
            "tx": round(x, 2),
            "ty": round(y, 2),
            "scale": round(scale, 4),
            "rotation": round(deg["rotation"], 2),
            "decay_offset": round(deg["decay_offset"], 4),
            "noise_offset": round(deg["noise_offset"], 4),
            "opacity": round(deg["opacity"], 4),
        })

    return copies


def onTableUpdate(dat):
    """
    Script DAT callback — writes the copy table each frame.
    Wire this to a Script DAT that feeds the Replicator.
    """
    try:
        controller = op("decay_controller")
        decay = controller["decay_factor"].eval()
        phase_idx = int(controller["phase_index"].eval())
        phases = ["aura", "reproduction", "erosion", "dissolution"]
        phase = phases[phase_idx] if phase_idx < len(phases) else "aura"
        num_copies = int(controller["reproduction_n"].eval())
    except Exception:
        decay = 0.0
        phase = "aura"
        num_copies = 1

    copies = generate_copy_table(num_copies, decay, phase)

    dat.clear()
    if copies:
        # Header row
        headers = list(copies[0].keys())
        for col, h in enumerate(headers):
            dat[0, col] = h

        # Data rows
        for row, copy in enumerate(copies):
            for col, key in enumerate(headers):
                dat[row + 1, col] = copy[key]
