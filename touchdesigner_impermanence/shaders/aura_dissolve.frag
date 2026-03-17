// Aura Dissolution Shader
// =======================
// GLSL fragment shader for TouchDesigner GLSL TOP
//
// Conceptual basis: Walter Benjamin describes "aura" as the unique
// presence of a work of art — its authenticity tied to time and place.
// Mechanical reproduction strips this aura away. This shader performs
// that stripping visually:
//
// 1. Chromatic separation — colors drift apart as memory distorts
// 2. Spatial dissolution — pixels scatter from their original positions
// 3. Temporal bleed — the feedback input (previous frame) haunts the current
// 4. Detail erosion — high-frequency information is progressively lost
// 5. Vignette of forgetting — edges dissolve first, center last
//
// Inputs:
//   sTD2DInputs[0] — current source image
//   sTD2DInputs[1] — feedback (previous frame from feedback TOP)
//
// Uniforms driven by the decay_engine.py Script CHOP:
//   uDecayFactor    — 0.0 to 1.0, overall decay progress
//   uNoiseAmp       — amplitude of displacement noise
//   uContrastLoss   — how much contrast to remove
//   uColorDrift     — chromatic aberration amount
//   uGhostOpacity   — blend weight of temporal ghost
//   uAuraRemaining  — 1.0 - decay_factor
//   uTime           — absTime.seconds

uniform float uDecayFactor;
uniform float uNoiseAmp;
uniform float uContrastLoss;
uniform float uColorDrift;
uniform float uGhostOpacity;
uniform float uAuraRemaining;
uniform float uTime;

// Hash-based pseudo-random
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Value noise
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // smoothstep

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion — layered noise for organic texture
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amplitude * vnoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Vignette — edges of memory fade first
float vignetteOfForgetting(vec2 uv, float strength) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    // Non-circular vignette — asymmetric like actual memory loss
    float angle = atan(center.y, center.x);
    float wobble = 1.0 + 0.15 * sin(angle * 3.0 + uTime * 0.2);
    dist *= wobble;
    return smoothstep(0.2, 0.7 + (1.0 - strength) * 0.3, dist);
}

out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec2 res = uTD2DInfos[0].res.zw;

    float decay = clamp(uDecayFactor, 0.0, 1.0);
    float t = uTime;

    // =====================================================================
    // Phase 1: SPATIAL DISSOLUTION — pixels drift from original positions
    // =====================================================================
    float displace_strength = uNoiseAmp * decay;
    vec2 noise_uv = uv * 8.0 + vec2(t * 0.05, t * 0.03);
    vec2 displacement = vec2(
        fbm(noise_uv, 4) - 0.5,
        fbm(noise_uv + vec2(100.0), 4) - 0.5
    ) * displace_strength;

    vec2 dissolved_uv = uv + displacement;

    // =====================================================================
    // Phase 2: CHROMATIC SEPARATION — memory distorts color
    // =====================================================================
    float chroma_offset = uColorDrift * 0.01;

    // Each color channel samples from a slightly different position
    // — like a misregistered print, or a fading photograph
    vec2 r_uv = dissolved_uv + vec2(chroma_offset, -chroma_offset * 0.5);
    vec2 g_uv = dissolved_uv;
    vec2 b_uv = dissolved_uv - vec2(chroma_offset * 0.7, chroma_offset);

    float r = texture(sTD2DInputs[0], r_uv).r;
    float g = texture(sTD2DInputs[0], g_uv).g;
    float b = texture(sTD2DInputs[0], b_uv).b;

    vec4 current = vec4(r, g, b, 1.0);

    // =====================================================================
    // Phase 3: DETAIL EROSION — high frequencies disappear
    // =====================================================================
    // Sample neighbors for a blur effect that increases with decay
    float blur_radius = decay * 3.0 / res.x;
    vec4 blurred = vec4(0.0);
    float total_weight = 0.0;

    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * blur_radius;
            float weight = 1.0 / (1.0 + length(vec2(float(x), float(y))));
            blurred += texture(sTD2DInputs[0], dissolved_uv + offset) * weight;
            total_weight += weight;
        }
    }
    blurred /= total_weight;

    // Mix sharp and blurred based on decay
    current = mix(current, blurred, decay * 0.6);

    // =====================================================================
    // Phase 4: CONTRAST & SATURATION LOSS — the image flattens
    // =====================================================================
    // Desaturate
    float luma = dot(current.rgb, vec3(0.2126, 0.7152, 0.0722));
    current.rgb = mix(current.rgb, vec3(luma), uContrastLoss * 0.8);

    // Flatten contrast toward middle gray
    current.rgb = mix(current.rgb, vec3(0.5), uContrastLoss * 0.4);

    // Warm shift — old photographs yellow
    float warmth = decay * 0.15;
    current.r += warmth * 0.8;
    current.g += warmth * 0.4;
    current.b -= warmth * 0.3;

    // =====================================================================
    // Phase 5: TEMPORAL BLEED — the past haunts the present
    // =====================================================================
    vec4 feedback = texture(sTD2DInputs[1], uv);

    // Feedback with slight drift — ghosts shift position
    vec2 ghost_drift = vec2(
        sin(t * 0.1) * 0.002,
        cos(t * 0.13) * 0.002
    ) * decay;
    vec4 ghost = texture(sTD2DInputs[1], uv + ghost_drift);

    // Blend current frame with its ghost
    current = mix(current, ghost, uGhostOpacity * 0.5);

    // =====================================================================
    // Phase 6: GRAIN & ENTROPY — noise as the arrow of time
    // =====================================================================
    float grain = (hash(uv * res + vec2(t * 60.0)) - 0.5) * uNoiseAmp * 2.0;
    current.rgb += vec3(grain);

    // Structured noise — like mold or water damage
    float damage_noise = fbm(uv * 20.0 + vec2(t * 0.01), 5);
    float damage_mask = smoothstep(0.5 - decay * 0.4, 0.5, damage_noise);
    current.rgb = mix(current.rgb, vec3(luma * 0.8 + 0.1), damage_mask * decay * 0.3);

    // =====================================================================
    // Phase 7: VIGNETTE OF FORGETTING — edges dissolve first
    // =====================================================================
    float vignette = vignetteOfForgetting(uv, decay);
    // Where the vignette is strong, replace with noise/emptiness
    vec3 void_color = vec3(
        fbm(uv * 5.0 + t * 0.02, 3) * 0.1,
        fbm(uv * 5.0 + t * 0.02 + 50.0, 3) * 0.08,
        fbm(uv * 5.0 + t * 0.02 + 100.0, 3) * 0.06
    );
    current.rgb = mix(void_color, current.rgb, 1.0 - vignette * decay);

    // =====================================================================
    // Phase 8: FINAL DISSOLUTION — approaching total loss
    // =====================================================================
    if (decay > 0.85) {
        float dissolution = (decay - 0.85) / 0.15;  // 0 to 1 in final phase
        dissolution = dissolution * dissolution;      // Accelerate at the end

        // Pixel-level dissolution — individual pixels vanish
        float pixel_hash = hash(floor(uv * res));
        float threshold = dissolution;
        if (pixel_hash < threshold) {
            current.rgb = void_color;
        }

        // Overall fade to void
        current.rgb = mix(current.rgb, void_color, dissolution * 0.5);
    }

    // =====================================================================
    // AURA INDICATOR — subtle golden border when aura remains
    // =====================================================================
    float edge_dist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float aura_border = smoothstep(0.0, 0.02, edge_dist) *
                        (1.0 - smoothstep(0.02, 0.04, edge_dist));
    vec3 aura_color = vec3(0.95, 0.85, 0.4) * uAuraRemaining;
    current.rgb += aura_border * aura_color * 0.5;

    // Clamp output
    current.rgb = clamp(current.rgb, 0.0, 1.0);
    current.a = 1.0;

    fragColor = TDOutputSwizzle(current);
}
