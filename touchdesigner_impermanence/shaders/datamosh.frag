// Datamosh / Displacement Shader
// ================================
// GLSL fragment shader for TouchDesigner GLSL TOP
//
// Treats the image as a corrupted video stream — motion vectors
// pointing to frames that no longer exist, I-frames dropped,
// P-frames referencing ghosts.
//
// This is history as broken transmission: the record exists but
// the playback mechanism has failed. The image is technically present
// but semantically destroyed. The container persists; the content
// has been displaced.
//
// Stages of datamosh decay:
//   1. Subtle displacement — pixels drift to wrong positions
//   2. Block smearing — rectangular regions slide across the frame
//   3. Frame blending artifacts — temporal data from wrong moments
//   4. I-frame starvation — keyframes dissolve, only deltas remain
//   5. Complete displacement — the image is a map of its own destruction
//
// Inputs:
//   sTD2DInputs[0] — current source image
//   sTD2DInputs[1] — feedback (previous frame)
//
// Uniforms:
//   uDecayFactor   — 0.0 to 1.0
//   uNoiseAmp      — entropy noise level
//   uContrastLoss  — contrast reduction
//   uColorDrift    — color drift amount
//   uGhostOpacity  — feedback blend
//   uAuraRemaining — 1.0 - decay
//   uTime          — absTime.seconds

uniform float uDecayFactor;
uniform float uNoiseAmp;
uniform float uContrastLoss;
uniform float uColorDrift;
uniform float uGhostOpacity;
uniform float uAuraRemaining;
uniform float uTime;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amp * vnoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return value;
}

out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec2 res = uTD2DInputs[0].res.zw;
    float decay = clamp(uDecayFactor, 0.0, 1.0);
    float t = uTime;

    vec2 pixelCoord = uv * res;

    // =================================================================
    // 1. MOTION VECTOR CORRUPTION — pixels displaced by fake vectors
    // =================================================================
    // Generate fake motion vectors that grow more chaotic with decay.
    // These simulate what happens when a codec reads motion data
    // from a corrupted bitstream.

    // Large-scale flow field
    vec2 flowScale = vec2(5.0 + decay * 10.0);
    float flowAngle = fbm(uv * flowScale + vec2(t * 0.05), 4) * 6.28318;
    float flowMag = fbm(uv * flowScale * 0.7 + vec2(t * 0.03, 100.0), 3);
    flowMag *= decay * 0.15;

    vec2 motionVector = vec2(cos(flowAngle), sin(flowAngle)) * flowMag;

    // Add sudden direction changes (corrupted vector table)
    float vectorCorruption = step(0.85 - decay * 0.3, hash(floor(uv * 20.0) + vec2(floor(t * 2.0))));
    vec2 corruptVector = vec2(
        hash(floor(pixelCoord / 16.0) + vec2(t * 3.7)) - 0.5,
        hash(floor(pixelCoord / 16.0) + vec2(t * 5.3, 100.0)) - 0.5
    ) * decay * 0.3;
    motionVector = mix(motionVector, corruptVector, vectorCorruption);

    vec2 displaced_uv = uv + motionVector;

    // =================================================================
    // 2. MACROBLOCK SMEARING — rectangular regions slide
    // =================================================================
    // Video codecs process in macroblocks (16x16 or larger).
    // When a keyframe is missing, blocks smear across frames.

    float blockSize = mix(8.0, 64.0, decay);
    vec2 blockID = floor(pixelCoord / blockSize);

    // Determine if this block is "smeared" (missing reference frame)
    float smearProb = decay * 0.6;
    float isSmeared = step(1.0 - smearProb,
                           hash3(vec3(blockID, floor(t * 0.5))));

    if (isSmeared > 0.5) {
        // This block's motion vector is wildly wrong
        vec2 smearDir = vec2(
            hash(blockID + vec2(42.0)) - 0.5,
            hash(blockID + vec2(73.0)) - 0.5
        ) * 2.0;

        // Smear distance increases with time (block slides further)
        float smearDist = decay * 0.2 * (1.0 + sin(t * 0.5 + hash(blockID) * 6.28));
        displaced_uv = uv + smearDir * smearDist;

        // Block also picks up color from the wrong time
        // (sample from feedback with offset)
        vec4 smearColor = texture(sTD2DInputs[1], displaced_uv + smearDir * 0.05);
        vec4 currentColor = texture(sTD2DInputs[0], displaced_uv);

        // Blend — the smeared block is mostly old data
        float smearBlend = 0.3 + decay * 0.5;

        // Hard block edge — characteristic of datamosh
        vec4 result = mix(currentColor, smearColor, smearBlend);
    }

    // =================================================================
    // 3. I-FRAME STARVATION — keyframes dissolve
    // =================================================================
    // Without keyframes (full reference images), the codec can only
    // show deltas (differences). The base image fades away.

    vec4 source = texture(sTD2DInputs[0], displaced_uv);
    vec4 feedback = texture(sTD2DInputs[1], displaced_uv);

    // I-frame strength decreases with decay
    float iFrameStrength = max(0.0, 1.0 - decay * 1.3);

    // P-frame: difference between current and previous
    vec4 pFrame = source - feedback;

    // Without I-frames, we only see accumulated deltas
    vec4 current;
    if (decay < 0.3) {
        // Early: mostly source with slight displacement
        current = texture(sTD2DInputs[0], displaced_uv);
    } else {
        // Late: feedback (accumulated) + weak delta
        vec4 delta = (source - feedback) * (1.0 + decay);
        current = mix(source, feedback + delta * 0.5, 1.0 - iFrameStrength);
    }

    // =================================================================
    // 4. COLOR CHANNEL DESYNC — temporal offset per channel
    // =================================================================
    // Each color channel references a different moment in time
    float channelOffset = decay * 0.02;

    // Red from slightly displaced position (past)
    float r = texture(sTD2DInputs[1],
        displaced_uv + vec2(channelOffset, 0.0)).r;

    // Green from current (present)
    float g = current.g;

    // Blue from opposite displacement (future guess)
    float b = texture(sTD2DInputs[0],
        displaced_uv - vec2(0.0, channelOffset * 1.3)).b;

    // Blend channel separation with decay
    float channelSep = smoothstep(0.2, 0.7, decay);
    current.r = mix(current.r, r, channelSep * 0.7);
    current.b = mix(current.b, b, channelSep * 0.7);

    // =================================================================
    // 5. PIXEL SORTING — a datamosh signature effect
    // =================================================================
    // Pixels within each row sort by brightness, creating horizontal
    // streaks. We simulate this by displacing pixels horizontally
    // based on their brightness.
    if (decay > 0.15) {
        float sortDecay = (decay - 0.15) / 0.85;

        float brightness = dot(current.rgb, vec3(0.299, 0.587, 0.114));

        // Brighter pixels displace further right
        float sortDisplace = (brightness - 0.5) * sortDecay * 0.1;

        // Only some rows get sorted (random selection)
        float rowHash = hash(vec2(floor(pixelCoord.y / 2.0), floor(t * 0.3)));
        float rowSorted = step(1.0 - sortDecay * 0.4, rowHash);

        if (rowSorted > 0.5) {
            vec2 sortUV = uv + vec2(sortDisplace, 0.0);
            vec4 sorted = texture(sTD2DInputs[0], sortUV);
            current = mix(current, sorted, sortDecay * 0.6);
        }
    }

    // =================================================================
    // 6. BLOCK ARTIFACTS — hard edges between regions
    // =================================================================
    // Make block boundaries visible (characteristic of codec failure)
    vec2 inBlock = fract(pixelCoord / blockSize);
    float blockEdge = 1.0 - step(0.05, inBlock.x) * step(0.05, inBlock.y) *
                      step(0.05, 1.0 - inBlock.x) * step(0.05, 1.0 - inBlock.y);

    // Block edges are more visible on smeared blocks
    if (isSmeared > 0.5) {
        current.rgb = mix(current.rgb, vec3(0.0, 1.0, 0.3), blockEdge * 0.3 * decay);
    }

    // =================================================================
    // 7. TEMPORAL ECHO — frames bleeding across time
    // =================================================================
    // Multiple time-offset samples create ghosting
    float echoStrength = decay * 0.4;
    vec2 echo1_uv = uv + motionVector * 2.0;
    vec2 echo2_uv = uv - motionVector * 1.5;

    vec4 echo1 = texture(sTD2DInputs[1], echo1_uv);
    vec4 echo2 = texture(sTD2DInputs[1], echo2_uv);

    current = mix(current, (echo1 + echo2) * 0.5, echoStrength * uGhostOpacity);

    // =================================================================
    // 8. GLITCH SCANLINES — horizontal corruption bands
    // =================================================================
    if (decay > 0.3) {
        float glitchDecay = (decay - 0.3) / 0.7;

        // Random horizontal bands that shift
        float bandY = floor(pixelCoord.y / 3.0);
        float bandHash = hash(vec2(bandY, floor(t * 8.0)));
        float isGlitched = step(1.0 - glitchDecay * 0.15, bandHash);

        if (isGlitched > 0.5) {
            // Shift this scanline horizontally
            float shiftAmount = (hash(vec2(bandY, floor(t * 4.0) + 50.0)) - 0.5) * 0.2;
            vec4 shifted = texture(sTD2DInputs[0], uv + vec2(shiftAmount, 0.0));
            current = mix(current, shifted, 0.8);

            // Occasional color flash
            float flash = step(0.95, bandHash);
            current.rgb += vec3(0.0, flash * 0.5, flash * 0.3);
        }
    }

    // =================================================================
    // 9. ULTIMATE DISPLACEMENT — the image becomes its own map
    // =================================================================
    if (decay > 0.8) {
        float finalDecay = (decay - 0.8) / 0.2;
        finalDecay = finalDecay * finalDecay;

        // Use the image's own color values as UV coordinates
        // The image literally displaces itself into abstraction
        vec2 selfUV = current.rg;  // Red = X, Green = Y
        selfUV = mix(uv, selfUV, finalDecay * 0.5);

        vec4 selfDisplaced = texture(sTD2DInputs[0], selfUV);
        current = mix(current, selfDisplaced, finalDecay * 0.7);

        // Fade toward digital void (not black — corrupted green/magenta)
        vec3 digitalVoid = vec3(0.0, 0.05, 0.02);
        current.rgb = mix(current.rgb, digitalVoid, finalDecay * 0.6);
    }

    // =================================================================
    // AURA BORDER
    // =================================================================
    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float auraBorder = smoothstep(0.0, 0.02, edgeDist) *
                       (1.0 - smoothstep(0.02, 0.04, edgeDist));
    vec3 auraColor = vec3(0.95, 0.85, 0.4) * uAuraRemaining;
    current.rgb += auraBorder * auraColor * 0.5;

    current.rgb = clamp(current.rgb, 0.0, 1.0);
    current.a = 1.0;

    fragColor = TDOutputSwizzle(current);
}
