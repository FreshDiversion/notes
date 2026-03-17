"""
Decay Engine — The Impermanence of Image
==========================================
TouchDesigner Script CHOP callback that drives the entropy system.

Benjamin wrote that mechanical reproduction detaches the object from the
domain of tradition — the "aura" withers. This engine models that withering
as a mathematical process: each frame, the image loses information,
accumulates noise, and drifts further from the "original."

The decay is irreversible within a cycle. Only a deliberate "re-aura"
action (capturing a new original) resets the process, mirroring how
history itself is rewritten rather than restored.

Channels produced:
    decay_factor    — 0.0 (pristine) to 1.0 (fully dissolved)
    noise_amp       — amplitude of entropy noise injection
    contrast_loss   — how much contrast has been lost
    color_drift     — chromatic shift representing memory distortion
    reproduction_n  — number of active mechanical copies
    ghost_opacity   — opacity of temporal ghost layers
    aura_remaining  — inverse of decay; the "authenticity" left
"""

import math
import random

# ---------------------------------------------------------------------------
# State — persists across frames inside TouchDesigner
# ---------------------------------------------------------------------------

class DecayState:
    """Holds the mutable state of the decay process."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.frame_count = 0
        self.decay_factor = 0.0
        self.noise_amp = 0.005
        self.contrast_loss = 0.0
        self.color_drift = 0.0
        self.reproduction_count = 1
        self.ghost_opacity = 0.0
        self.paused = False
        self.phase = "aura"          # aura → reproduction → erosion → dissolution
        self.phase_thresholds = {
            "aura": 0.0,
            "reproduction": 0.15,
            "erosion": 0.45,
            "dissolution": 0.75,
        }
        # Stochastic memory — random "damage" events
        self.damage_events = []
        self.last_damage_frame = 0

    def current_phase(self):
        """Determine which conceptual phase we are in."""
        for phase in reversed(["dissolution", "erosion", "reproduction", "aura"]):
            if self.decay_factor >= self.phase_thresholds[phase]:
                return phase
        return "aura"


_state = DecayState()


# ---------------------------------------------------------------------------
# Decay curves — different mathematical models of loss
# ---------------------------------------------------------------------------

def logarithmic_decay(t, rate=0.008):
    """Slow start, accelerating loss — like fading memory."""
    return min(1.0, rate * math.log1p(t))


def exponential_decay(t, half_life=3000):
    """Radioactive-style decay — information has a half-life."""
    return 1.0 - math.exp(-0.693 * t / half_life)


def sigmoid_decay(t, midpoint=4500, steepness=0.002):
    """S-curve: stable, then rapid collapse, then plateau at dissolution."""
    return 1.0 / (1.0 + math.exp(-steepness * (t - midpoint)))


def composite_decay(t):
    """
    Blend of decay models — mirrors the complex, non-linear way
    images actually degrade in cultural memory.
    """
    log_d = logarithmic_decay(t)
    exp_d = exponential_decay(t)
    sig_d = sigmoid_decay(t)

    # Weight shifts over time: early=logarithmic, mid=exponential, late=sigmoid
    if t < 1500:
        return 0.6 * log_d + 0.3 * exp_d + 0.1 * sig_d
    elif t < 4500:
        return 0.2 * log_d + 0.5 * exp_d + 0.3 * sig_d
    else:
        return 0.1 * log_d + 0.2 * exp_d + 0.7 * sig_d


# ---------------------------------------------------------------------------
# Stochastic damage — sudden losses (wars, floods, censorship)
# ---------------------------------------------------------------------------

def check_for_damage_event(state):
    """
    Randomly introduce 'catastrophic' damage events that accelerate decay.
    These represent historical accidents — fires, wars, deliberate erasure.
    Probability increases as the image becomes more fragile.
    """
    frames_since_last = state.frame_count - state.last_damage_frame
    if frames_since_last < 120:  # Minimum 2 seconds between events at 60fps
        return 0.0

    # Probability increases with existing decay
    base_probability = 0.0005
    fragility_bonus = state.decay_factor * 0.003
    probability = base_probability + fragility_bonus

    if random.random() < probability:
        severity = random.uniform(0.02, 0.08) * (1.0 + state.decay_factor)
        state.last_damage_frame = state.frame_count
        state.damage_events.append({
            "frame": state.frame_count,
            "severity": severity,
        })
        return severity

    return 0.0


# ---------------------------------------------------------------------------
# Reproduction logic — Benjamin's central thesis
# ---------------------------------------------------------------------------

def update_reproduction_count(state):
    """
    As decay progresses, the number of reproductions increases.
    Each reproduction is a further loss of aura.
    In the dissolution phase, copies begin to disappear too.
    """
    phase = state.current_phase()

    if phase == "aura":
        state.reproduction_count = 1
    elif phase == "reproduction":
        # Copies multiply
        progress = (state.decay_factor - 0.15) / 0.30
        state.reproduction_count = int(1 + progress * 8)
    elif phase == "erosion":
        # Peak reproduction, copies start degrading
        state.reproduction_count = max(4, int(9 - (state.decay_factor - 0.45) * 10))
    elif phase == "dissolution":
        # Even copies dissolve
        progress = (state.decay_factor - 0.75) / 0.25
        state.reproduction_count = max(1, int(4 * (1.0 - progress)))


# ---------------------------------------------------------------------------
# TouchDesigner Script CHOP Callbacks
# ---------------------------------------------------------------------------

def onSetupParameters(scriptOp):
    """Called when the Script CHOP is set up."""
    page = scriptOp.appendCustomPage("Impermanence")
    page.appendFloat("Decayrate", label="Decay Rate", default=1.0, min=0.0, max=5.0)
    page.appendFloat("Damageprob", label="Damage Probability", default=1.0, min=0.0, max=3.0)
    page.appendToggle("Paused", label="Paused", default=False)
    page.appendPulse("Reset", label="Reset Aura")
    page.appendMenu("Decaymodel", label="Decay Model",
                     menuNames=["composite", "logarithmic", "exponential", "sigmoid"],
                     menuLabels=["Composite (Recommended)", "Logarithmic", "Exponential", "Sigmoid"],
                     default=0)


def onPulse(par):
    """Handle pulse parameters (Reset button)."""
    if par.name == "Reset":
        _state.reset()


def onCook(scriptOp):
    """Called every frame — the heartbeat of the decay."""
    global _state

    # Read custom parameters
    if hasattr(scriptOp.par, "Paused"):
        _state.paused = scriptOp.par.Paused.eval()

    if _state.paused:
        _write_channels(scriptOp)
        return

    # Advance time
    _state.frame_count += 1
    t = _state.frame_count

    # Get decay rate multiplier
    rate_mult = 1.0
    if hasattr(scriptOp.par, "Decayrate"):
        rate_mult = scriptOp.par.Decayrate.eval()

    # Choose decay model
    model = "composite"
    if hasattr(scriptOp.par, "Decaymodel"):
        model = scriptOp.par.Decaymodel.eval()

    decay_funcs = {
        "composite": composite_decay,
        "logarithmic": logarithmic_decay,
        "exponential": exponential_decay,
        "sigmoid": sigmoid_decay,
    }
    decay_func = decay_funcs.get(model, composite_decay)

    # Compute base decay
    base_decay = decay_func(t * rate_mult)

    # Add stochastic damage
    damage_prob_mult = 1.0
    if hasattr(scriptOp.par, "Damageprob"):
        damage_prob_mult = scriptOp.par.Damageprob.eval()

    # Temporarily scale damage probability
    damage = check_for_damage_event(_state) * damage_prob_mult

    # Final decay factor (clamped)
    _state.decay_factor = min(1.0, base_decay + damage +
                              sum(e["severity"] * 0.1 for e in _state.damage_events))

    # Derived parameters
    d = _state.decay_factor
    _state.noise_amp = 0.005 + d * 0.15
    _state.contrast_loss = d * 0.6
    _state.color_drift = d * 0.3 * (1.0 + 0.2 * math.sin(t * 0.01))
    _state.ghost_opacity = min(0.8, d * 1.2)

    # Update reproduction count
    update_reproduction_count(_state)

    # Write all channels
    _write_channels(scriptOp)


def _write_channels(scriptOp):
    """Output all decay state as CHOP channels."""
    scriptOp.clear()

    channels = {
        "decay_factor": _state.decay_factor,
        "noise_amp": _state.noise_amp,
        "contrast_loss": _state.contrast_loss,
        "color_drift": _state.color_drift,
        "reproduction_n": float(_state.reproduction_count),
        "ghost_opacity": _state.ghost_opacity,
        "aura_remaining": 1.0 - _state.decay_factor,
        "phase_index": float(["aura", "reproduction", "erosion", "dissolution"]
                             .index(_state.current_phase())),
        "frame_count": float(_state.frame_count),
        "damage_count": float(len(_state.damage_events)),
    }

    for name, value in channels.items():
        chan = scriptOp.appendChan(name)
        chan[0] = value
