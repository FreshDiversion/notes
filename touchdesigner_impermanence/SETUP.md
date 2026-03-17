# The Impermanence of Image — Interactive Artwork

An interactive artwork built in TouchDesigner exploring the dissolution of
photographic aura, drawing from Walter Benjamin's *The Work of Art in the Age
of Mechanical Reproduction* (1935).

## Concept

An image enters the system carrying "aura" — Benjamin's term for the unique
presence of an original tied to time and place. Over time, the system:

1. **Reproduces** the image mechanically — copies multiply
2. **Degrades** each copy — contrast fades, color drifts, noise accumulates
3. **Erases** the original — pixels scatter, text fragments dissolve
4. **Dissolves** into void — nothing remains but the memory of having seen

The viewer witnesses history being unmade in real time.

## Four Phases

| Phase | Decay | Visual |
|---|---|---|
| **Aura** | 0.00–0.15 | Pristine image with golden border, Benjamin text fades in |
| **Reproduction** | 0.15–0.45 | Copies multiply in a grid, each more degraded than the last |
| **Erosion** | 0.45–0.75 | Detail crumbles, colors drift, text fragments, spiral layout |
| **Dissolution** | 0.75–1.00 | Pixels scatter, copies vanish, void consumes the frame |

## Requirements

- **TouchDesigner** 2023.11000+ (free/commercial)
- Webcam (optional — can use a file image instead)
- GPU with GLSL 3.30+ support

## Setup

1. Open TouchDesigner and create a new project
2. Open the Textport (`Alt+T`)
3. Run the network builder:
   ```python
   exec(open('/path/to/touchdesigner_impermanence/project_build.py').read())
   ```
4. The full network will be constructed automatically
5. Place a source image at `assets/source_image.jpg` (or use webcam)

## Project Structure

```
touchdesigner_impermanence/
├── project_build.py              # Auto-builds the TD network
├── scripts/
│   ├── decay_engine.py           # Core decay algorithm (Script CHOP)
│   ├── reproduction_system.py    # Mechanical copy management (Replicator)
│   ├── timeline_erasure.py       # Text overlay + phase transitions
│   └── keyboard_input.py         # Performer interaction controls
├── shaders/
│   ├── aura_dissolve.frag        # Organic dissolution — memory fading
│   ├── generation_loss.frag      # JPEG recompression — reproduction as degradation
│   ├── halftone_print.frag       # Mechanical print — dots, ink, paper aging
│   └── datamosh.frag             # Corrupted video — displaced history
└── assets/
    └── (place source_image.jpg here)
```

## Controls

| Key | Action |
|---|---|
| `C` | Capture new aura (freeze current frame as original) |
| `R` | Reset — restore the image to pristine state |
| `Space` | Pause / resume decay |
| `Up/Down` | Adjust decay speed |
| `S` | Switch between camera and file input |
| `D` | Trigger a damage event (war, flood, censorship) |
| `F` | Toggle fullscreen |
| `1–4` | Jump to a specific phase |
| `5` | Shader: Aura Dissolve (organic memory fading) |
| `6` | Shader: Generation Loss (JPEG recompression artifacts) |
| `7` | Shader: Halftone Print (mechanical reproduction as dots/ink) |
| `8` | Shader: Datamosh (corrupted video, displaced history) |

## The Decay Engine

The decay follows a composite curve blending three mathematical models:

- **Logarithmic** — slow start, like fading memory (dominant early)
- **Exponential** — information has a half-life (dominant mid)
- **Sigmoid** — sudden collapse then plateau (dominant late)

Stochastic "damage events" (probability increases with fragility) represent
historical catastrophes — fires, wars, deliberate erasure.

## The Shaders

Four switchable dissolution modes (keys `5`–`8`), each a different lens on
Benjamin's thesis. All share the same decay engine and uniform inputs.

### 1. Aura Dissolve (`aura_dissolve.frag`) — key `5`
Organic, photographic decay. Memory fading like a daguerreotype left in sunlight.
- Spatial dissolution via FBM noise displacement
- Chromatic separation (RGB channels diverge like misregistered memory)
- Detail erosion, contrast/saturation collapse toward warm gray
- Temporal bleed from feedback loop (ghosts haunt the present)
- Asymmetric vignette of forgetting (edges dissolve first)
- Pixel-level dissolution in the final phase

### 2. Generation Loss (`generation_loss.frag`) — key `6`
JPEG recompression artifacts. Each feedback pass is another "Save As" — the
image eats itself through its own reproduction. The artifact IS the reproduction.
- DCT block quantization (block size grows with decay: 4px → 32px)
- Color posterization (256 levels → 4 levels)
- Chroma subsampling simulation (4:2:0)
- Gibbs ringing at edges (overshoots near sharp transitions)
- Block boundary seams, mosquito noise
- Color banding in smooth gradients

### 3. Halftone Print (`halftone_print.frag`) — key `7`
The "mechanical" in mechanical reproduction made literal. Continuous tone broken
into a grid of dots — each dot a tiny act of approximation.
- CMYK separation with independent screen angles (15°/75°/0°/45°)
- Plate misregistration that drifts with decay
- Subtractive ink mixing on aging paper
- Dot frequency coarsens (fine screen → newsprint → poster)
- Paper foxing, yellowing, water damage
- Moiré interference patterns emerge from misaligned screens
- Ink bleed and spread

### 4. Datamosh (`datamosh.frag`) — key `8`
History as corrupted video stream. The container persists; the content has
been displaced. Technical presence, semantic destruction.
- Motion vector corruption (flow field displacement)
- Macroblock smearing (blocks slide across frames)
- I-frame starvation (keyframes dissolve, only deltas remain)
- Per-channel temporal desync (R=past, G=present, B=future)
- Pixel sorting (brightness-based horizontal streaks)
- Glitch scanlines (horizontal corruption bands)
- Self-displacement (image uses its own pixels as UV coordinates)

## Text Layer

Fragments from Benjamin's essay appear and dissolve alongside the image.
The text itself degrades through five stages:

1. Letter substitution (misremembering)
2. Word dropout (forgetting)
3. Letter vanishing (fragmentation)
4. Noise replacement (corruption)
5. Total erasure

## Conceptual Notes

> "Even the most perfect reproduction of a work of art is lacking in one
> element: its presence in time and space, its unique existence at the place
> where it happens to be." — Walter Benjamin, 1935

This piece argues that every image is already in the process of disappearing.
The camera does not preserve — it begins the process of dissolution. The
moment of capture is the moment aura begins to wither. History recorded is
history already being forgotten.

The work is complete when the screen is dark and the viewer is left only
with the memory of what they saw — which is itself already decaying.
