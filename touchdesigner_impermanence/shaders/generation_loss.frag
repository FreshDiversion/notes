// Generation Loss Shader — JPEG Recompression Artifacts
// =====================================================
// GLSL fragment shader for TouchDesigner GLSL TOP
//
// Simulates the cumulative degradation of repeated lossy compression.
// Each pass through the feedback loop is another "save as JPEG" —
// the image eats itself through its own reproduction.
//
// This is Benjamin's thesis rendered as data: the artifact of
// reproduction IS the reproduction. The blocky, ringing, color-banded
// remnants are the fingerprint of the machine.
//
// Technique:
//   1. Quantize to DCT-like blocks (8x8, growing with decay)
//   2. Reduce color precision (posterization)
//   3. Introduce ringing artifacts at edges (Gibbs phenomenon)
//   4. Shift chroma subsampling (4:2:0 simulation)
//   5. Accumulate block boundary discontinuities
//
// Inputs:
//   sTD2DInputs[0] — current source image
//   sTD2DInputs[1] — feedback (previous frame)
//
// Uniforms:
//   uDecayFactor   — 0.0 to 1.0
//   uNoiseAmp      — entropy noise level
//   uContrastLoss  — contrast reduction
//   uColorDrift    — color channel drift
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

// Pseudo-random
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Approximate a 1D DCT basis function
float dctBasis(float n, float k, float N) {
    return cos(3.14159265 * (2.0 * n + 1.0) * k / (2.0 * N));
}

out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec2 res = uTD2DInfos[0].res.zw;
    float decay = clamp(uDecayFactor, 0.0, 1.0);

    // =================================================================
    // 1. BLOCK QUANTIZATION — DCT block size grows with decay
    // =================================================================
    // JPEG uses 8x8 blocks. As quality drops, effective block size grows
    // because high-frequency coefficients are zeroed out.
    float blockSize = mix(4.0, 32.0, decay * decay);

    // Snap UV to block grid
    vec2 pixelCoord = uv * res;
    vec2 blockCoord = floor(pixelCoord / blockSize) * blockSize;
    vec2 blockUV = blockCoord / res;

    // Position within the block (0 to 1)
    vec2 inBlock = fract(pixelCoord / blockSize);

    // Sample the block's average color (simulating DC coefficient dominance)
    vec4 blockAvg = vec4(0.0);
    float samples = 0.0;
    float sampleStep = max(1.0, blockSize / 4.0);

    for (float y = 0.0; y < blockSize; y += sampleStep) {
        for (float x = 0.0; x < blockSize; x += sampleStep) {
            vec2 sampleUV = (blockCoord + vec2(x, y) + 0.5) / res;
            sampleUV = clamp(sampleUV, 0.0, 1.0);
            blockAvg += texture(sTD2DInputs[0], sampleUV);
            samples += 1.0;
        }
    }
    blockAvg /= samples;

    // Original pixel color
    vec4 original = texture(sTD2DInputs[0], uv);

    // Blend between original and block average based on decay
    // Low decay = mostly original, high decay = mostly blocky
    float blockiness = smoothstep(0.0, 0.6, decay);
    vec4 current = mix(original, blockAvg, blockiness);

    // =================================================================
    // 2. COLOR QUANTIZATION — Posterization (reduced bit depth)
    // =================================================================
    // JPEG quantization reduces color precision. Simulate by snapping
    // color values to fewer discrete levels.
    float levels = mix(256.0, 4.0, decay * decay);
    current.rgb = floor(current.rgb * levels + 0.5) / levels;

    // =================================================================
    // 3. CHROMA SUBSAMPLING — 4:2:0 simulation
    // =================================================================
    // JPEG subsamples chrominance. Simulate by blurring chroma channels
    // more aggressively than luma.
    float chromaBlock = blockSize * 2.0;  // Chroma at half resolution
    vec2 chromaCoord = floor(pixelCoord / chromaBlock) * chromaBlock;
    vec2 chromaUV = (chromaCoord + chromaBlock * 0.5) / res;
    chromaUV = clamp(chromaUV, 0.0, 1.0);

    vec4 chromaSample = texture(sTD2DInputs[0], chromaUV);

    // Convert to YCbCr-like space
    float Y = dot(current.rgb, vec3(0.299, 0.587, 0.114));
    float Cb_orig = current.b - Y;
    float Cr_orig = current.r - Y;

    float Y_chroma = dot(chromaSample.rgb, vec3(0.299, 0.587, 0.114));
    float Cb_sub = chromaSample.b - Y_chroma;
    float Cr_sub = chromaSample.r - Y_chroma;

    // Blend chroma toward subsampled version
    float chromaLoss = smoothstep(0.1, 0.5, decay);
    float Cb = mix(Cb_orig, Cb_sub, chromaLoss);
    float Cr = mix(Cr_orig, Cr_sub, chromaLoss);

    // Convert back to RGB
    current.r = Y + Cr;
    current.g = Y - 0.344 * Cb - 0.714 * Cr;
    current.b = Y + Cb;

    // =================================================================
    // 4. RINGING ARTIFACTS — Gibbs phenomenon at edges
    // =================================================================
    // Sharp edges in JPEG produce ringing (overshoots/undershoots).
    // Detect edges and add oscillating artifacts.
    vec2 texelSize = 1.0 / res;

    float edgeH = length(
        texture(sTD2DInputs[0], uv + vec2(texelSize.x, 0.0)).rgb -
        texture(sTD2DInputs[0], uv - vec2(texelSize.x, 0.0)).rgb
    );
    float edgeV = length(
        texture(sTD2DInputs[0], uv + vec2(0.0, texelSize.y)).rgb -
        texture(sTD2DInputs[0], uv - vec2(0.0, texelSize.y)).rgb
    );
    float edge = edgeH + edgeV;

    // Ringing: oscillation near edges, amplitude grows with decay
    float ringFreq = 3.14159 * blockSize * 0.5;
    float ringH = sin(inBlock.x * ringFreq) * edge * decay * 0.3;
    float ringV = sin(inBlock.y * ringFreq) * edge * decay * 0.3;
    current.rgb += vec3(ringH + ringV);

    // =================================================================
    // 5. BLOCK BOUNDARY ARTIFACTS — visible seams between blocks
    // =================================================================
    // The grid lines between DCT blocks become visible at low quality
    float boundaryX = 1.0 - smoothstep(0.0, 2.0 / blockSize, inBlock.x) *
                      smoothstep(0.0, 2.0 / blockSize, 1.0 - inBlock.x);
    float boundaryY = 1.0 - smoothstep(0.0, 2.0 / blockSize, inBlock.y) *
                      smoothstep(0.0, 2.0 / blockSize, 1.0 - inBlock.y);
    float boundary = max(boundaryX, boundaryY);

    // Darken along block boundaries
    current.rgb -= vec3(boundary * decay * 0.15);

    // =================================================================
    // 6. FEEDBACK ACCUMULATION — Each loop is another "save"
    // =================================================================
    vec4 feedback = texture(sTD2DInputs[1], uv);

    // The feedback itself gets block-quantized (degradation compounds)
    vec2 fbBlockCoord = floor(pixelCoord / (blockSize * 0.8)) * (blockSize * 0.8);
    vec2 fbBlockUV = (fbBlockCoord + blockSize * 0.4) / res;
    fbBlockUV = clamp(fbBlockUV, 0.0, 1.0);
    vec4 fbQuantized = texture(sTD2DInputs[1], fbBlockUV);

    // Blend with feedback — each frame compounds the loss
    float fbBlend = uGhostOpacity * 0.4;
    current = mix(current, mix(feedback, fbQuantized, decay * 0.5), fbBlend);

    // =================================================================
    // 7. COLOR BANDING — smooth gradients become stepped
    // =================================================================
    // Additional banding in smooth areas (where JPEG struggles most)
    float localVariance = length(original.rgb - blockAvg.rgb);
    float isSmooth = 1.0 - smoothstep(0.0, 0.1, localVariance);
    float bandLevels = mix(64.0, 3.0, decay * isSmooth);
    vec3 banded = floor(current.rgb * bandLevels + 0.5) / bandLevels;
    current.rgb = mix(current.rgb, banded, isSmooth * decay * 0.7);

    // =================================================================
    // 8. MOSQUITO NOISE — fine-grained noise near edges
    // =================================================================
    float mosquito = hash(pixelCoord + vec2(uTime * 60.0)) - 0.5;
    mosquito *= edge * decay * 0.4;
    current.rgb += vec3(mosquito);

    // =================================================================
    // AURA BORDER — fading golden edge
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
