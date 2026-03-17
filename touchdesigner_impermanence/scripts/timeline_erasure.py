"""
Historical Erasure Timeline
============================
TouchDesigner Script DAT / Extension for the temporal narrative layer.

This system overlays textual fragments from Benjamin's essay that appear
and dissolve in sync with the image decay. The text itself degrades —
letters drop out, words scramble, sentences fragment — mirroring the
image's dissolution. The viewer reads history being erased in real time.

The timeline also controls phase transitions and triggers visual events
(damage, reproduction bursts, color shifts) at narratively significant
moments.
"""

import math
import random
import string


# ---------------------------------------------------------------------------
# Benjamin fragments — source text that dissolves with the image
# ---------------------------------------------------------------------------

BENJAMIN_FRAGMENTS = [
    # Phase: AURA (0.0 - 0.15)
    {
        "text": "Even the most perfect reproduction lacks one element: its presence in time and space",
        "phase": "aura",
        "decay_start": 0.0,
        "decay_end": 0.12,
    },
    {
        "text": "The authenticity of a thing is the essence of all that is transmissible from its beginning",
        "phase": "aura",
        "decay_start": 0.03,
        "decay_end": 0.15,
    },
    {
        "text": "The unique value of the authentic work of art has its basis in ritual",
        "phase": "aura",
        "decay_start": 0.08,
        "decay_end": 0.20,
    },

    # Phase: REPRODUCTION (0.15 - 0.45)
    {
        "text": "To an ever greater degree the work of art reproduced becomes the work of art designed for reproducibility",
        "phase": "reproduction",
        "decay_start": 0.15,
        "decay_end": 0.35,
    },
    {
        "text": "The technique of reproduction detaches the reproduced object from the domain of tradition",
        "phase": "reproduction",
        "decay_start": 0.20,
        "decay_end": 0.40,
    },
    {
        "text": "By making many reproductions it substitutes a plurality of copies for a unique existence",
        "phase": "reproduction",
        "decay_start": 0.30,
        "decay_end": 0.45,
    },

    # Phase: EROSION (0.45 - 0.75)
    {
        "text": "That which withers in the age of mechanical reproduction is the aura of the work of art",
        "phase": "erosion",
        "decay_start": 0.45,
        "decay_end": 0.65,
    },
    {
        "text": "The situations into which the product of mechanical reproduction can be brought may not touch the actual work of art yet the quality of its presence is always depreciated",
        "phase": "erosion",
        "decay_start": 0.50,
        "decay_end": 0.70,
    },
    {
        "text": "History is the subject of a structure whose site is not homogeneous empty time but time filled by the presence of the now",
        "phase": "erosion",
        "decay_start": 0.60,
        "decay_end": 0.75,
    },

    # Phase: DISSOLUTION (0.75 - 1.0)
    {
        "text": "The tradition of the oppressed teaches us that the state of emergency in which we live is not the exception but the rule",
        "phase": "dissolution",
        "decay_start": 0.75,
        "decay_end": 0.90,
    },
    {
        "text": "There is no document of civilization which is not at the same time a document of barbarism",
        "phase": "dissolution",
        "decay_start": 0.80,
        "decay_end": 0.95,
    },
    {
        "text": "...",
        "phase": "dissolution",
        "decay_start": 0.95,
        "decay_end": 1.0,
    },
]


# ---------------------------------------------------------------------------
# Text degradation functions — the words themselves decay
# ---------------------------------------------------------------------------

def degrade_text(text, intensity):
    """
    Progressively destroy text. Intensity 0.0 = pristine, 1.0 = gone.

    Stages of degradation:
    0.0 - 0.2: Occasional letter substitution (misremembering)
    0.2 - 0.4: Words start dropping out (forgetting)
    0.4 - 0.6: Letters within words vanish (fragmentation)
    0.6 - 0.8: Characters replaced by noise (corruption)
    0.8 - 1.0: Almost nothing remains (erasure)
    """
    if intensity <= 0.0:
        return text
    if intensity >= 1.0:
        return ""

    chars = list(text)
    result = chars[:]

    # Stage 1: Letter substitution
    if intensity > 0.05:
        sub_prob = min(0.3, (intensity - 0.05) * 0.5)
        for i, c in enumerate(result):
            if c.isalpha() and random.random() < sub_prob:
                # Replace with visually similar or nearby character
                result[i] = _similar_char(c)

    # Stage 2: Word dropout
    if intensity > 0.2:
        words = "".join(result).split(" ")
        drop_prob = min(0.7, (intensity - 0.2) * 1.0)
        words = [w if random.random() > drop_prob else "   " for w in words]
        result = list(" ".join(words))

    # Stage 3: Letter vanishing
    if intensity > 0.4:
        vanish_prob = min(0.6, (intensity - 0.4) * 1.5)
        for i, c in enumerate(result):
            if c.isalnum() and random.random() < vanish_prob:
                result[i] = " "

    # Stage 4: Noise replacement
    if intensity > 0.6:
        noise_prob = min(0.5, (intensity - 0.6) * 2.0)
        noise_chars = "░▒▓█▄▀│┤╡╢╖╕╣║╗╝╜╛┐─┼"
        for i, c in enumerate(result):
            if c != " " and random.random() < noise_prob:
                result[i] = random.choice(noise_chars)

    # Stage 5: Final erasure
    if intensity > 0.8:
        erase_prob = min(0.9, (intensity - 0.8) * 4.0)
        for i in range(len(result)):
            if random.random() < erase_prob:
                result[i] = " "

    return "".join(result).strip()


def _similar_char(c):
    """Return a visually similar character (simulating misremembering)."""
    similar = {
        "a": "àáâãäå", "e": "èéêë", "i": "ìíîï", "o": "òóôõö",
        "u": "ùúûü", "n": "ñ", "c": "ç", "s": "ś",
        "A": "ÀÁÂÃÄ", "E": "ÈÉÊË", "I": "ÌÍÎÏ", "O": "ÒÓÔÕÖ",
    }
    if c in similar:
        return random.choice(similar[c])
    if c.isalpha():
        # Shift by 1-2 in alphabet
        offset = random.choice([-2, -1, 1, 2])
        new_ord = ord(c) + offset
        if c.islower() and ord("a") <= new_ord <= ord("z"):
            return chr(new_ord)
        if c.isupper() and ord("A") <= new_ord <= ord("Z"):
            return chr(new_ord)
    return c


# ---------------------------------------------------------------------------
# Timeline controller
# ---------------------------------------------------------------------------

class ErasureTimeline:
    """Manages the narrative timeline of text fragments."""

    def __init__(self):
        self.fragments = BENJAMIN_FRAGMENTS
        self.active_texts = []

    def update(self, decay_factor, frame_count):
        """
        Given current decay_factor, return list of visible text fragments
        with appropriate degradation applied.
        """
        self.active_texts = []

        for frag in self.fragments:
            if frag["decay_start"] <= decay_factor <= frag["decay_end"]:
                # Calculate local intensity within this fragment's lifespan
                span = frag["decay_end"] - frag["decay_start"]
                if span > 0:
                    local_progress = (decay_factor - frag["decay_start"]) / span
                else:
                    local_progress = 1.0

                # Fade in during first 20%, full during middle, degrade in last 60%
                if local_progress < 0.2:
                    # Fade in
                    opacity = local_progress / 0.2
                    degradation = 0.0
                elif local_progress < 0.4:
                    # Clear
                    opacity = 1.0
                    degradation = 0.0
                else:
                    # Degrade
                    opacity = max(0.0, 1.0 - (local_progress - 0.4) / 0.6)
                    degradation = (local_progress - 0.4) / 0.6

                degraded = degrade_text(frag["text"], degradation)

                self.active_texts.append({
                    "text": degraded,
                    "original": frag["text"],
                    "phase": frag["phase"],
                    "opacity": opacity,
                    "degradation": degradation,
                    "y_position": self._text_position(frag, decay_factor),
                })

        return self.active_texts

    def _text_position(self, frag, decay_factor):
        """Vertical position for the text — drifts downward as it decays."""
        base_y = 0.9  # Start near top
        drift = (decay_factor - frag["decay_start"]) * 0.5
        return max(0.1, base_y - drift)


# ---------------------------------------------------------------------------
# Phase transition events
# ---------------------------------------------------------------------------

PHASE_EVENTS = {
    "reproduction": {
        "trigger_decay": 0.15,
        "description": "First reproduction — aura begins to wither",
        "visual_action": "burst_copies",
        "params": {"num_copies": 4, "spread": 0.3},
    },
    "erosion": {
        "trigger_decay": 0.45,
        "description": "Erosion phase — detail crumbles away",
        "visual_action": "accelerate_noise",
        "params": {"noise_multiplier": 2.0, "blur_increase": 1.5},
    },
    "dissolution": {
        "trigger_decay": 0.75,
        "description": "Dissolution — the image approaches non-existence",
        "visual_action": "pixel_scatter",
        "params": {"scatter_intensity": 0.8, "fade_rate": 0.02},
    },
    "void": {
        "trigger_decay": 0.98,
        "description": "Nothing remains but the memory of having seen",
        "visual_action": "fade_to_void",
        "params": {"target_color": [0.02, 0.02, 0.02]},
    },
}


class PhaseTransitionManager:
    """Detects and fires phase transitions."""

    def __init__(self):
        self.fired_phases = set()

    def check(self, decay_factor):
        """Return any newly triggered phase events."""
        triggered = []
        for phase, event in PHASE_EVENTS.items():
            if (phase not in self.fired_phases and
                    decay_factor >= event["trigger_decay"]):
                self.fired_phases.add(phase)
                triggered.append(event)
        return triggered

    def reset(self):
        self.fired_phases.clear()


# ---------------------------------------------------------------------------
# TouchDesigner Script DAT Callbacks
# ---------------------------------------------------------------------------

_timeline = ErasureTimeline()
_phase_mgr = PhaseTransitionManager()


def onCook(scriptDat):
    """
    Called every frame. Writes current text fragments to the DAT table
    for use by Text TOPs in the network.
    """
    try:
        controller = op("decay_controller")
        decay = controller["decay_factor"].eval()
        frame = int(controller["frame_count"].eval())
    except Exception:
        decay = 0.0
        frame = 0

    # Update timeline
    active = _timeline.update(decay, frame)

    # Check for phase transitions
    transitions = _phase_mgr.check(decay)
    for t in transitions:
        print(f"[Impermanence] Phase transition: {t['description']}")

    # Write to DAT
    scriptDat.clear()
    scriptDat[0, 0] = "text"
    scriptDat[0, 1] = "opacity"
    scriptDat[0, 2] = "phase"
    scriptDat[0, 3] = "y_position"
    scriptDat[0, 4] = "degradation"

    for i, entry in enumerate(active):
        row = i + 1
        scriptDat[row, 0] = entry["text"]
        scriptDat[row, 1] = str(round(entry["opacity"], 3))
        scriptDat[row, 2] = entry["phase"]
        scriptDat[row, 3] = str(round(entry["y_position"], 3))
        scriptDat[row, 4] = str(round(entry["degradation"], 3))
