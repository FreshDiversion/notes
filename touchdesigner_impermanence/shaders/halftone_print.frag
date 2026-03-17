// Halftone / Mechanical Print Shader
// ===================================
// GLSL fragment shader for TouchDesigner GLSL TOP
//
// Converts the image into a halftone dot pattern — the visual language
// of mass printing. The "mechanical" in mechanical reproduction made
// literal: the continuous tone of reality broken into a grid of dots,
// each dot a tiny act of approximation.
//
// As decay progresses:
//   - Dot size grows (coarser screen = cheaper print = wider distribution)
//   - Screen angles drift (misregistration between CMYK plates)
//   - Moiré patterns emerge (interference = noise = entropy)
//   - Ink bleeds and spreads (physical decay of the printed object)
//   - Paper yellows and foxes (the substrate itself is impermanent)
//
// Inputs:
//   sTD2DInputs[0] — current source image
//   sTD2DInputs[1] — feedback (previous frame)
//
// Uniforms:
//   uDecayFactor   — 0.0 to 1.0
//   uNoiseAmp      — entropy noise level
//   uContrastLoss  — contrast reduction
//   uColorDrift    — color channel drift / plate misregistration
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

#define PI 3.14159265359

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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

// Rotate a 2D point around origin
vec2 rotate2D(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Single-channel halftone at a given screen angle and frequency
float halftone(vec2 uv, float value, float frequency, float angle, float decay) {
    // Rotate UV by screen angle
    vec2 rotUV = rotate2D(uv, angle);

    // Scale to dot frequency
    vec2 dotUV = rotUV * frequency;

    // Cell coordinates
    vec2 cell = floor(dotUV);
    vec2 inCell = fract(dotUV) - 0.5;  // -0.5 to 0.5, centered

    // Dot radius proportional to darkness (darker = bigger dot)
    float darkness = 1.0 - value;
    float dotRadius = sqrt(darkness) * 0.5;

    // Ink bleed — dots spread with decay
    float bleed = decay * 0.15;
    dotRadius += bleed;

    // Wobble — mechanical imprecision increases with decay
    float wobble = decay * 0.08;
    vec2 offset = vec2(
        sin(cell.x * 13.7 + uTime * 0.3) * wobble,
        cos(cell.y * 17.3 + uTime * 0.2) * wobble
    );
    inCell += offset;

    // Distance from dot center
    float dist = length(inCell);

    // Sharp dot edge, softening with decay (ink spread)
    float edgeSoftness = mix(0.01, 0.15, decay);
    float dot = 1.0 - smoothstep(dotRadius - edgeSoftness, dotRadius + edgeSoftness, dist);

    return dot;
}

out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec2 res = uTD2DInfos[0].res.zw;
    float decay = clamp(uDecayFactor, 0.0, 1.0);
    float t = uTime;

    // =================================================================
    // 1. SAMPLE SOURCE — with plate misregistration per channel
    // =================================================================
    // Traditional CMYK screen angles (in radians):
    // C: 15°, M: 75°, Y: 0°, K: 45°
    // As decay increases, these angles drift — misregistration
    float angleC = radians(15.0)  + decay * 0.12 * sin(t * 0.07);
    float angleM = radians(75.0)  + decay * 0.15 * cos(t * 0.09);
    float angleY = radians(0.0)   + decay * 0.08 * sin(t * 0.11);
    float angleK = radians(45.0)  + decay * 0.05;

    // Plate registration offset (physical misalignment)
    float regOffset = uColorDrift * 0.003;
    vec2 uvC = uv + vec2(regOffset, -regOffset * 0.7);
    vec2 uvM = uv + vec2(-regOffset * 0.5, regOffset);
    vec2 uvY = uv - vec2(regOffset * 0.8, regOffset * 0.3);
    vec2 uvK = uv;  // Black plate is the reference

    vec4 srcC = texture(sTD2DInputs[0], uvC);
    vec4 srcM = texture(sTD2DInputs[0], uvM);
    vec4 srcY = texture(sTD2DInputs[0], uvY);
    vec4 srcK = texture(sTD2DInputs[0], uvK);

    // =================================================================
    // 2. RGB TO CMYK CONVERSION
    // =================================================================
    // Simple RGB to CMYK
    float K = 1.0 - max(max(srcK.r, srcK.g), srcK.b);
    float C = (1.0 - srcC.r - K) / max(1.0 - K, 0.001);
    float M = (1.0 - srcM.g - K) / max(1.0 - K, 0.001);
    float Y = (1.0 - srcY.b - K) / max(1.0 - K, 0.001);

    C = clamp(C, 0.0, 1.0);
    M = clamp(M, 0.0, 1.0);
    Y = clamp(Y, 0.0, 1.0);
    K = clamp(K, 0.0, 1.0);

    // =================================================================
    // 3. HALFTONE SCREENING — dots at different angles
    // =================================================================
    // Screen frequency decreases with decay (coarser dots = cheaper reproduction)
    float baseFreq = mix(120.0, 15.0, decay * decay);

    // Each plate gets slightly different frequency (realistic printing)
    float freqC = baseFreq * 1.0;
    float freqM = baseFreq * 1.02;
    float freqY = baseFreq * 0.98;
    float freqK = baseFreq * 1.01;

    // Pixel coordinates for screening
    vec2 screenUV = uv * res;

    float dotC = halftone(screenUV, C, freqC / res.x * 100.0, angleC, decay);
    float dotM = halftone(screenUV, M, freqM / res.x * 100.0, angleM, decay);
    float dotY = halftone(screenUV, Y, freqY / res.x * 100.0, angleY, decay);
    float dotK = halftone(screenUV, K, freqK / res.x * 100.0, angleK, decay);

    // =================================================================
    // 4. CMYK TO RGB — ink on paper
    // =================================================================
    // Subtractive color mixing (ink absorbs light)
    vec3 paperColor = vec3(1.0);  // White paper (for now)

    // Each ink subtracts from the paper
    vec3 cyanInk    = vec3(0.0, 0.65, 0.85);
    vec3 magentaInk = vec3(0.85, 0.0, 0.45);
    vec3 yellowInk  = vec3(0.0, 0.1, 0.85);  // Yellow subtracts blue
    vec3 blackInk   = vec3(0.0, 0.0, 0.0);

    // Apply each ink layer
    vec3 result = paperColor;
    result = mix(result, result * (1.0 - cyanInk),    dotC * 0.85);
    result = mix(result, result * (1.0 - magentaInk),  dotM * 0.85);
    result = mix(result, result * vec3(1.0, 0.95, 0.1), dotY * 0.7);
    result -= vec3(dotK * 0.9);

    // =================================================================
    // 5. PAPER AGING — the substrate decays too
    // =================================================================
    // Yellowing (foxing)
    float foxing = decay * 0.25;
    vec3 agedPaper = vec3(
        1.0 - foxing * 0.1,
        1.0 - foxing * 0.2,
        1.0 - foxing * 0.5
    );
    // Apply paper color where there's no ink
    float inkCoverage = max(max(dotC, dotM), max(dotY, dotK));
    result = mix(result * agedPaper, result, inkCoverage * 0.5);

    // Paper texture — visible grain
    float paperGrain = vnoise(uv * res * 0.5 + vec2(t * 0.01)) * 0.08 * (1.0 + decay);
    result += vec3(paperGrain) * (1.0 - inkCoverage * 0.7);

    // Foxing spots — brown spots on old paper
    float foxSpots = vnoise(uv * 30.0 + vec2(42.0));
    foxSpots = smoothstep(0.7 - decay * 0.2, 0.75, foxSpots);
    result = mix(result, vec3(0.6, 0.45, 0.25), foxSpots * decay * 0.4);

    // =================================================================
    // 6. INK DEGRADATION — colors fade over time
    // =================================================================
    // Magenta fades fastest, yellow is most stable (realistic)
    float fadeC = decay * 0.3;
    float fadeM = decay * 0.45;  // Magenta is fugitive
    float fadeY = decay * 0.15;  // Yellow persists
    float fadeK = decay * 0.2;

    result = mix(result, vec3(dot(result, vec3(0.333))), decay * 0.3);

    // =================================================================
    // 7. MOIRÉ PATTERNS — interference from misaligned screens
    // =================================================================
    // Moiré emerges naturally from overlapping screens at wrong angles,
    // but we can emphasize it
    float moire1 = sin(screenUV.x * freqC * 0.1 + screenUV.y * freqM * 0.1);
    float moire2 = sin(screenUV.x * freqM * 0.08 - screenUV.y * freqK * 0.12);
    float moirePattern = (moire1 + moire2) * 0.5;
    float moireStrength = decay * decay * 0.1;
    result += vec3(moirePattern * moireStrength);

    // =================================================================
    // 8. FEEDBACK — accumulation of print generations
    // =================================================================
    vec4 feedback = texture(sTD2DInputs[1], uv);
    result = mix(result, feedback.rgb, uGhostOpacity * 0.3);

    // =================================================================
    // 9. WATER DAMAGE — staining and blurring
    // =================================================================
    if (decay > 0.5) {
        float waterDecay = (decay - 0.5) / 0.5;
        float water = vnoise(uv * 8.0 + vec2(t * 0.005));
        water = smoothstep(0.4, 0.6, water);

        // Water makes ink run
        vec2 runDir = vec2(0.0, -1.0) * water * waterDecay * 0.005;
        vec3 runSample = texture(sTD2DInputs[0], uv + runDir).rgb;
        result = mix(result, runSample * agedPaper, water * waterDecay * 0.3);

        // Water stains
        float stain = vnoise(uv * 15.0 + vec2(7.0));
        stain = smoothstep(0.6 - waterDecay * 0.2, 0.65, stain);
        result = mix(result, vec3(0.55, 0.45, 0.3), stain * waterDecay * 0.25);
    }

    // =================================================================
    // AURA BORDER
    // =================================================================
    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float auraBorder = smoothstep(0.0, 0.02, edgeDist) *
                       (1.0 - smoothstep(0.02, 0.04, edgeDist));
    vec3 auraGold = vec3(0.95, 0.85, 0.4) * uAuraRemaining;
    result += auraBorder * auraGold * 0.5;

    result = clamp(result, 0.0, 1.0);

    fragColor = TDOutputSwizzle(vec4(result, 1.0));
}
