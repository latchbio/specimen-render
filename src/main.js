import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import "./style.css";

const COLORS = {
  beige: new THREE.Color("#faf6ec"),
  blue: new THREE.Color("#0d42f0"),
};

const sceneElement = document.querySelector("#scene");
const loadingElement = document.querySelector("#loading");
const specimenOptions = document.querySelector("#specimen-options");
const detailModeSelect = document.querySelector("#detail-mode");
const roundedDotControls = document.querySelector("#rounded-dot-controls");
const roundedDotSizeInput = document.querySelector("#rounded-dot-size");
const roundedDotSizeOutput = document.querySelector("#rounded-dot-size-value");
const roundedDotScaleInput = document.querySelector("#rounded-dot-scale");
const frequencyModulationControls = document.querySelector("#frequency-modulation-controls");
const fmOmegaInput = document.querySelector("#fm-omega");
const fmOmegaOutput = document.querySelector("#fm-omega-value");
const fmPhaseInput = document.querySelector("#fm-phase");
const fmPhaseOutput = document.querySelector("#fm-phase-value");
const fmQuantInput = document.querySelector("#fm-quant");
const fmQuantOutput = document.querySelector("#fm-quant-value");
const fmClaheInput = document.querySelector("#fm-clahe");
const fmNegateInput = document.querySelector("#fm-negate");
const lightControls = document.querySelector("#light-controls");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const metrics = {
  triangles: document.querySelector("#metric-triangles"),
  size: document.querySelector("#metric-size"),
  lod: document.querySelector("#metric-lod"),
  distance: document.querySelector("#metric-distance"),
  fps: document.querySelector("#metric-fps"),
  drawCalls: document.querySelector("#metric-draw-calls"),
};

const LOD_LEVELS = [
  { distance: 0, label: "0 · HIGH" },
  { distance: 8.2, label: "1 · MED" },
];

const DETAIL_MODES = {
  baseline: 0,
  xdog: 1,
  tonal: 2,
  gtao: 3,
  "blue-noise": 4,
  normal: 5,
  cross: 6,
  line: 7,
  rounded: 8,
  "frequency-modulation": 9,
};

const SPECIMENS = {
  bacteriophage: {
    id: "bacteriophage",
    label: "Bacteriophage",
    path: "/models/Bacteriophage_001.obj",
    embeddedKey: "__BACTERIOPHAGE_OBJ__",
    roughness: 0.72,
    metalness: 0.08,
  },
  "hepatitis-c": {
    id: "hepatitis-c",
    label: "Hepatitis C",
    path: "/models/Hepatitis_C.obj",
    embeddedKey: "__HEPATITIS_C_OBJ__",
    roughness: 0.72,
    metalness: 0.08,
    smoothNormals: true,
  },
  "red-blood-cell": {
    id: "red-blood-cell",
    label: "Red Blood Cell",
    path: "/models/Red_Blood_Cell.obj",
    embeddedKey: "__RED_BLOOD_CELL_OBJ__",
    roughness: 0.72,
    metalness: 0.08,
    smoothNormals: true,
  },
  virus: {
    id: "virus",
    label: "Virus",
    path: "/models/Virus.obj",
    embeddedKey: "__VIRUS_OBJ__",
    roughness: 0.72,
    metalness: 0.08,
  },
  antibody: {
    id: "antibody",
    label: "Antibody",
    path: "/models/Antibodies_Final.obj",
    embeddedKey: "__ANTIBODY_OBJ__",
    roughness: 0.72,
    metalness: 0.08,
  },
  "cell-aggregate": {
    id: "cell-aggregate",
    label: "Cell Aggregate",
    path: "/models/Cell_Aggregate.obj",
    embeddedKey: "__CELL_AGGREGATE_OBJ__",
    roughness: 0.78,
    metalness: 0.03,
  },
  "pebbled-sphere": {
    id: "pebbled-sphere",
    label: "Pebbled Sphere",
    path: "/models/Pebbled_Sphere.obj",
    embeddedKey: "__PEBBLED_SPHERE_OBJ__",
    roughness: 0.8,
    metalness: 0.02,
  },
  basophil: {
    id: "basophil",
    label: "Basophil",
    path: "/models/Basophil.obj",
    embeddedKey: "__BASOPHIL_OBJ__",
    roughness: 0.78,
    metalness: 0.03,
  },
  brain: {
    id: "brain",
    label: "Brain",
    path: "/models/Brain.obj",
    embeddedKey: "__BRAIN_OBJ__",
    roughness: 0.8,
    metalness: 0.02,
  },
};

const scene = new THREE.Scene();
scene.background = COLORS.beige;

const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
camera.position.set(6.4, 2.4, 7.7);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneElement.clientWidth, sceneElement.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
sceneElement.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5.4;
controls.maxDistance = 13;
controls.autoRotate = false;
controls.target.set(0.8, 0, 0);
const referenceCameraDistance = camera.position.distanceTo(controls.target);

const isRotating = !prefersReducedMotion.matches;

const hemisphereLight = new THREE.HemisphereLight("#f8f1df", "#06205f", 1.35);
hemisphereLight.position.set(0, 1, 0);
camera.add(hemisphereLight);

function attachCameraLight(light, position, target) {
  light.position.set(...position);
  light.target.position.set(...target);
  camera.add(light, light.target);
}

const keyLight = new THREE.DirectionalLight("#ffffff", 7.2);
attachCameraLight(keyLight, [-5, 5, 4], [0, 0, -6]);

const rimLight = new THREE.DirectionalLight("#628cff", 4.8);
attachCameraLight(rimLight, [5, 2, -4], [0, 0, -6]);

const LIGHT_DEFAULTS = {
  "key-azimuth": -166,
  "key-elevation": 38,
  "key-intensity": 7.2,
  "rim-azimuth": 155,
  "rim-elevation": 42,
  "rim-intensity": 4.8,
  "ambient-intensity": 4.0,
};

function positionCameraLight(light, azimuth, elevation, radius) {
  const azimuthRadians = THREE.MathUtils.degToRad(azimuth);
  const elevationRadians = THREE.MathUtils.degToRad(elevation);
  const horizontalRadius = Math.cos(elevationRadians) * radius;
  light.position.set(
    Math.sin(azimuthRadians) * horizontalRadius,
    Math.sin(elevationRadians) * radius,
    Math.cos(azimuthRadians) * horizontalRadius,
  );
}

function updateLightControls() {
  if (!lightControls) return;

  const value = (name) =>
    Number(lightControls.querySelector(`[name="${name}"]`)?.value ?? LIGHT_DEFAULTS[name]);
  positionCameraLight(keyLight, value("key-azimuth"), value("key-elevation"), 8.2);
  positionCameraLight(rimLight, value("rim-azimuth"), value("rim-elevation"), 6.7);
  keyLight.intensity = value("key-intensity");
  rimLight.intensity = value("rim-intensity");
  hemisphereLight.intensity = value("ambient-intensity");

  lightControls.querySelectorAll("[data-light-value]").forEach((output) => {
    const name = output.dataset.lightValue;
    const unit = name.endsWith("intensity") ? "" : "°";
    output.value = `${value(name).toFixed(name.endsWith("intensity") ? 1 : 0)}${unit}`;
  });
}

lightControls?.addEventListener("input", updateLightControls);
lightControls?.querySelector("[data-reset-lights]")?.addEventListener("click", () => {
  Object.entries(LIGHT_DEFAULTS).forEach(([name, value]) => {
    const input = lightControls.querySelector(`[name="${name}"]`);
    if (input) input.value = String(value);
  });
  updateLightControls();
});
updateLightControls();

const specimen = new THREE.Group();
specimen.position.x = 1.15;
scene.add(specimen);

const trackerConfigs = [
  { position: [0, 1.65, 0], size: [104, 82], movement: [22, 13], period: 7.2, phase: 0, anchor: null },
  { position: [0, 0.72, 0.18], size: [78, 100], movement: [17, 24], period: 8.4, phase: 1.8, anchor: null },
  { position: [0, -0.2, 0], size: [96, 76], movement: [27, 16], period: 6.8, phase: 3.1, anchor: null },
  { position: [-0.72, -1.05, 0.3], size: [84, 64], movement: [24, 20], period: 9.1, phase: 4.7, anchor: null },
  { position: [0.72, -1.05, -0.3], size: [84, 64], movement: [20, 23], period: 7.7, phase: 6.2, anchor: null },
];
const trackingBoxes = trackerConfigs.map(() => new THREE.Vector4(-2, -2, 0, 0));
const trackingVisibility = new Float32Array(trackerConfigs.length);
const trackingDissolve = new Float32Array(trackerConfigs.length);
const projectedTrackerPosition = new THREE.Vector3();

const material = new THREE.MeshStandardMaterial({
  color: COLORS.blue,
  roughness: SPECIMENS.bacteriophage.roughness,
  metalness: SPECIMENS.bacteriophage.metalness,
  flatShading: false,
});

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtaoPass = detailModeSelect
  ? new GTAOPass(
      scene,
      camera,
      sceneElement.clientWidth,
      sceneElement.clientHeight,
      undefined,
      {
        radius: 0.18,
        distanceExponent: 1.6,
        thickness: 1.1,
        distanceFallOff: 1,
        scale: 1,
        samples: 16,
        screenSpaceRadius: false,
      },
    )
  : null;
if (gtaoPass) {
  gtaoPass.blendIntensity = 0.32;
  gtaoPass.enabled = false;
  composer.addPass(gtaoPass);
}
const normalTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
normalTarget.texture.colorSpace = THREE.NoColorSpace;
const normalMaterial = new THREE.MeshNormalMaterial();

const fullScreenVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

class HorizontalPhasePass extends Pass {
  constructor(background) {
    super();
    this.needsSwap = false;
    this.width = 1;
    this.pixelScale = 1;
    this.outputUniform = null;

    const targetOptions = {
      depthBuffer: false,
      stencilBuffer: false,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    };
    this.targets = [
      new THREE.WebGLRenderTarget(1, 1, targetOptions),
      new THREE.WebGLRenderTarget(1, 1, targetOptions),
    ];
    this.targets.forEach((target) => {
      target.texture.colorSpace = THREE.NoColorSpace;
      target.texture.generateMipmaps = false;
    });

    this.toneMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: null },
        uBackground: { value: background },
        uTexelSize: { value: new THREE.Vector2(1, 1) },
        uOmega: { value: 1.05 },
        uQuantLevel: { value: 49 },
        uUseClahe: { value: 1 },
      },
      vertexShader: fullScreenVertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 uBackground;
        uniform vec2 uTexelSize;
        uniform float uOmega;
        uniform float uQuantLevel;
        uniform float uUseClahe;
        varying vec2 vUv;

        float sourceLevel(vec3 color) {
          return dot(color, vec3(0.2126, 0.7152, 0.0722));
        }

        void main() {
          vec2 sampleUv = (floor(vUv / uTexelSize) + 0.5) * uTexelSize;
          vec3 color = texture2D(tDiffuse, sampleUv).rgb;
          float mask = step(0.12, distance(color, uBackground));
          float center = sourceLevel(color);
          float neighbors = (
            sourceLevel(texture2D(tDiffuse, sampleUv + vec2(uTexelSize.x, 0.0)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv - vec2(uTexelSize.x, 0.0)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv + vec2(0.0, uTexelSize.y)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv - vec2(0.0, uTexelSize.y)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv + vec2(uTexelSize.x, uTexelSize.y)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv + vec2(-uTexelSize.x, uTexelSize.y)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv + vec2(uTexelSize.x, -uTexelSize.y)).rgb) +
            sourceLevel(texture2D(tDiffuse, sampleUv + vec2(-uTexelSize.x, -uTexelSize.y)).rgb)
          ) * 0.125;
          float localMean = neighbors;
          float localDeviation = abs(center - localMean);
          float claheTone = clamp(
            (center - localMean) * mix(1.0, 3.2, clamp(localDeviation * 4.0, 0.0, 1.0)) +
              localMean,
            0.0,
            1.0
          );
          float tone = mix(center, claheTone, uUseClahe) * mask;
          float levels = max(2.0, uQuantLevel);
          float quantizedTone = floor(tone * (levels - 1.0) + 0.5) / (levels - 1.0);
          // Higher omega => slower phase advance ("less response"), matching the reference control.
          float phaseIncrement = quantizedTone * (0.2 / max(uOmega, 0.001));
          gl_FragColor = vec4(phaseIncrement, mask, quantizedTone, 1.0);
        }
      `,
    });

    this.scanMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tInput: { value: null },
        uTexelSize: { value: new THREE.Vector2(1, 1) },
        uOffset: { value: 1 },
      },
      vertexShader: fullScreenVertexShader,
      fragmentShader: `
        uniform sampler2D tInput;
        uniform vec2 uTexelSize;
        uniform float uOffset;
        varying vec2 vUv;

        void main() {
          vec4 value = texture2D(tInput, vUv);
          float sampleOffset = uOffset * uTexelSize.x;
          if (vUv.x > sampleOffset - uTexelSize.x * 0.5) {
            float previousPhase = texture2D(
              tInput,
              vUv - vec2(sampleOffset, 0.0)
            ).r;
            value.r = fract(value.r + previousPhase);
          }
          gl_FragColor = value;
        }
      `,
    });

    this.quad = new FullScreenQuad(this.toneMaterial);
  }

  setOutputUniform(uniform) {
    this.outputUniform = uniform;
  }

  setSize(width, height) {
    this.width = Math.max(1, Math.ceil(width / this.pixelScale));
    const resolvedHeight = Math.max(1, Math.ceil(height / this.pixelScale));
    this.targets.forEach((target) => target.setSize(this.width, resolvedHeight));
    this.toneMaterial.uniforms.uTexelSize.value.set(
      1 / this.width,
      1 / resolvedHeight,
    );
    this.scanMaterial.uniforms.uTexelSize.value.set(
      1 / this.width,
      1 / resolvedHeight,
    );
  }

  render(renderer, writeBuffer, readBuffer) {
    const previousTarget = renderer.getRenderTarget();
    this.toneMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.quad.material = this.toneMaterial;
    renderer.setRenderTarget(this.targets[0]);
    renderer.clear();
    this.quad.render(renderer);

    let sourceIndex = 0;
    for (let offset = 1; offset < this.width; offset *= 2) {
      const destinationIndex = 1 - sourceIndex;
      this.scanMaterial.uniforms.tInput.value = this.targets[sourceIndex].texture;
      this.scanMaterial.uniforms.uOffset.value = offset;
      this.quad.material = this.scanMaterial;
      renderer.setRenderTarget(this.targets[destinationIndex]);
      renderer.clear();
      this.quad.render(renderer);
      sourceIndex = destinationIndex;
    }

    if (this.outputUniform) {
      this.outputUniform.value = this.targets[sourceIndex].texture;
    }
    renderer.setRenderTarget(previousTarget);
  }

  dispose() {
    this.targets.forEach((target) => target.dispose());
    this.toneMaterial.dispose();
    this.scanMaterial.dispose();
    this.quad.dispose();
  }
}

const frequencyModulationPass = new HorizontalPhasePass(COLORS.beige);
frequencyModulationPass.enabled = false;

function createGlyphAtlas() {
  const characters = "1TCA0G";
  const cellWidth = 32;
  const cellHeight = 48;
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * characters.length;
  canvas.height = cellHeight;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = "500 35px 'DM Mono', monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";

  [...characters].forEach((character, index) => {
    context.fillText(character, index * cellWidth + cellWidth / 2, cellHeight / 2 + 1);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createBlueNoiseTexture(size = 16) {
  const count = size * size;
  const ranks = new Uint8Array(count);
  const selected = new Uint8Array(count);
  const nearestDistance = new Float32Array(count);
  nearestDistance.fill(Infinity);
  let nextPoint = Math.floor(count / 2);

  for (let rank = 0; rank < count; rank += 1) {
    if (rank > 0) {
      let bestDistance = -1;

      for (let candidate = 0; candidate < count; candidate += 1) {
        if (selected[candidate]) continue;
        if (nearestDistance[candidate] > bestDistance) {
          bestDistance = nearestDistance[candidate];
          nextPoint = candidate;
        }
      }
    }

    selected[nextPoint] = 1;
    ranks[nextPoint] = Math.round(((rank + 1) / (count + 1)) * 255);

    const pointX = nextPoint % size;
    const pointY = Math.floor(nextPoint / size);
    for (let candidate = 0; candidate < count; candidate += 1) {
      if (selected[candidate]) continue;
      const x = candidate % size;
      const y = Math.floor(candidate / size);
      const dx = Math.min(Math.abs(x - pointX), size - Math.abs(x - pointX));
      const dy = Math.min(Math.abs(y - pointY), size - Math.abs(y - pointY));
      nearestDistance[candidate] = Math.min(nearestDistance[candidate], dx * dx + dy * dy);
    }
  }

  const texture = new THREE.DataTexture(ranks, size, size, THREE.RedFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

const printShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: normalTarget.texture },
    tFrequencyPhase: { value: frequencyModulationPass.targets[0].texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCellSize: { value: new THREE.Vector2(9, 14) },
    uDitherPixelSize: { value: 1.38 },
    uTime: { value: 0 },
    uTrackBoxes: { value: trackingBoxes },
    uTrackVisibility: { value: trackingVisibility },
    uTrackDissolve: { value: trackingDissolve },
    uGlyphAtlas: { value: createGlyphAtlas() },
    uBlueNoise: { value: createBlueNoiseTexture() },
    uBlueNoiseLarge: { value: createBlueNoiseTexture(detailModeSelect ? 64 : 16) },
    uDetailMode: { value: DETAIL_MODES[detailModeSelect?.value] ?? DETAIL_MODES.normal },
    uRoundedDotSize: { value: Number(roundedDotSizeInput?.value ?? 5) },
    uRoundedDotScale: { value: roundedDotScaleInput?.checked ? 1 : 0 },
    uZoomScale: { value: 1 },
    uPhaseMultiplier: { value: Number(fmPhaseInput?.value ?? 1.23) },
    uFmNegate: { value: fmNegateInput?.checked ? 1 : 0 },
    uBackground: { value: COLORS.beige },
    uBlue: { value: COLORS.blue },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tFrequencyPhase;
    uniform sampler2D uGlyphAtlas;
    uniform sampler2D uBlueNoise;
    uniform sampler2D uBlueNoiseLarge;
    uniform vec2 uResolution;
    uniform vec2 uCellSize;
    uniform float uDitherPixelSize;
    uniform float uTime;
    uniform float uRoundedDotSize;
    uniform float uRoundedDotScale;
    uniform float uZoomScale;
    uniform float uPhaseMultiplier;
    uniform float uFmNegate;
    uniform int uDetailMode;
    uniform vec4 uTrackBoxes[5];
    uniform float uTrackVisibility[5];
    uniform float uTrackDissolve[5];
    uniform vec3 uBackground;
    uniform vec3 uBlue;
    varying vec2 vUv;

    float objectMask(vec3 color) {
      return smoothstep(0.08, 0.23, distance(color, uBackground));
    }

    vec3 linearToSrgb(vec3 color) {
      vec3 low = color * 12.92;
      vec3 high = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(high, low, lessThanEqual(color, vec3(0.0031308)));
    }

    float interleavedNoise(vec2 position) {
      return fract(52.9829189 * fract(dot(position, vec2(0.06711056, 0.00583715))));
    }

    float sourceLevel(vec3 color) {
      float peak = max(max(color.r, color.g), color.b);
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(peak, luminance, 0.45);
    }

    float normalDetail(vec2 uv, vec2 texel) {
      vec3 centerNormal = texture2D(tNormal, uv).rgb * 2.0 - 1.0;
      float alignment = min(
        max(
          dot(centerNormal, texture2D(tNormal, uv + vec2(texel.x, 0.0)).rgb * 2.0 - 1.0),
          -1.0
        ),
        max(
          dot(centerNormal, texture2D(tNormal, uv - vec2(texel.x, 0.0)).rgb * 2.0 - 1.0),
          -1.0
        )
      );
      alignment = min(
        alignment,
        min(
          dot(centerNormal, texture2D(tNormal, uv + vec2(0.0, texel.y)).rgb * 2.0 - 1.0),
          dot(centerNormal, texture2D(tNormal, uv - vec2(0.0, texel.y)).rgb * 2.0 - 1.0)
        )
      );
      return smoothstep(0.018, 0.22, 1.0 - clamp(alignment, -1.0, 1.0));
    }

    float phosphorTone(vec2 pixel, float pixelSize) {
      vec2 sampleUv = ((pixel + 0.5) * pixelSize) / uResolution;
      vec3 sampleColor = texture2D(tDiffuse, sampleUv).rgb;
      float mask = objectMask(sampleColor);
      vec2 texel = vec2(pixelSize) / uResolution;
      float center = sourceLevel(sampleColor);
      float neighbors =
        sourceLevel(texture2D(tDiffuse, sampleUv + vec2(texel.x, 0.0)).rgb) +
        sourceLevel(texture2D(tDiffuse, sampleUv - vec2(texel.x, 0.0)).rgb) +
        sourceLevel(texture2D(tDiffuse, sampleUv + vec2(0.0, texel.y)).rgb) +
        sourceLevel(texture2D(tDiffuse, sampleUv - vec2(0.0, texel.y)).rgb);
      float localDetail = center - neighbors * 0.25;
      float shaped = smoothstep(
        0.06,
        0.82,
        clamp(center * 1.08 + localDetail * 1.3, 0.0, 1.0)
      );
      shaped = pow(shaped, 0.9);
      float geometryDetail = max(
        normalDetail(sampleUv, texel),
        normalDetail(sampleUv, texel * 2.0) * 0.72
      );
      vec3 viewNormal = normalize(texture2D(tNormal, sampleUv).rgb * 2.0 - 1.0);
      float facing = smoothstep(0.12, 0.96, abs(viewNormal.z));
      float baseTone = 0.045 + shaped * 0.68 + (facing - 0.5) * 0.12;
      float detailCut = geometryDetail * mix(0.18, 0.32, shaped);
      float normalTone = clamp(baseTone - detailCut, 0.015, 0.82);

      if (uDetailMode == 0) {
        return mask * clamp(0.08 + shaped * 0.68, 0.02, 0.78);
      }

      if (uDetailMode == 1) {
        vec2 wideTexel = texel * 3.0;
        float wideAverage = (
          sourceLevel(texture2D(tDiffuse, sampleUv + vec2(wideTexel.x, 0.0)).rgb) +
          sourceLevel(texture2D(tDiffuse, sampleUv - vec2(wideTexel.x, 0.0)).rgb) +
          sourceLevel(texture2D(tDiffuse, sampleUv + vec2(0.0, wideTexel.y)).rgb) +
          sourceLevel(texture2D(tDiffuse, sampleUv - vec2(0.0, wideTexel.y)).rgb)
        ) * 0.25;
        float dog = abs(neighbors * 0.25 - wideAverage);
        float structuralLine = smoothstep(0.025, 0.16, dog + geometryDetail * 0.16);
        return mask * mix(clamp(0.055 + shaped * 0.44, 0.02, 0.58), 0.96, structuralLine);
      }

      if (uDetailMode == 2) {
        return mask * (floor(clamp(normalTone, 0.0, 1.0) * 4.0 + 0.5) / 4.0);
      }

      return mask * normalTone;
    }

    void main() {
      float pixelSize = max(1.0, uDitherPixelSize);
      vec2 ditherPixel = floor(gl_FragCoord.xy / pixelSize);
      float tone = phosphorTone(ditherPixel, pixelSize);
      float blueNoise = texture2D(uBlueNoise, (ditherPixel + 0.5) / 16.0).r;
      float largeBlueNoise = texture2D(uBlueNoiseLarge, (ditherPixel + 0.5) / 64.0).r;
      float threshold = uDetailMode == 4
        ? largeBlueNoise
        : mix(blueNoise, interleavedNoise(ditherPixel), 0.72);
      float ditherInk = step(threshold, tone) * step(0.01, tone);
      if (uDetailMode == 9) {
        float fmPixel = max(1.0, uDitherPixelSize);
        vec2 fmCell = floor(gl_FragCoord.xy / fmPixel);
        vec2 fmUv = (fmCell + 0.5) * fmPixel / uResolution;
        vec3 fmData = texture2D(tFrequencyPhase, fmUv).rgb;
        float carrier = fract(fmData.r * max(uPhaseMultiplier, 0.001));
        float response = smoothstep(0.15, 0.65, fmData.b);
        float carrierThreshold = mix(0.995, 0.36, response);
        float mark = step(carrierThreshold, carrier);
        mark = mix(mark, 1.0 - mark, uFmNegate);
        ditherInk = mark * step(0.5, fmData.g);
      }
      if (uDetailMode == 6) {
        float crossSize = max(3.0, uDitherPixelSize * 3.0);
        vec2 crossPixel = floor(gl_FragCoord.xy / crossSize);
        float crossTone = phosphorTone(crossPixel, crossSize);
        float crossNoise = texture2D(uBlueNoiseLarge, (crossPixel + 0.5) / 64.0).r;
        vec2 crossUv = abs(fract(gl_FragCoord.xy / crossSize) - 0.5);
        float armLength = mix(0.22, 0.49, smoothstep(0.04, 0.82, crossTone));
        float armWidth = mix(0.065, 0.14, smoothstep(0.12, 0.82, crossTone));
        float verticalArm = (1.0 - step(armWidth, crossUv.x)) *
          (1.0 - step(armLength, crossUv.y));
        float horizontalArm = (1.0 - step(armWidth, crossUv.y)) *
          (1.0 - step(armLength, crossUv.x));
        float crossGlyph = max(verticalArm, horizontalArm);
        ditherInk = crossGlyph * step(crossNoise, clamp(crossTone * 1.18, 0.0, 1.0));
        tone = crossTone;
      }
      if (uDetailMode == 7) {
        float linePhase = abs(fract((ditherPixel.x + ditherPixel.y * 0.68) / 6.0) - 0.5);
        float lineWidth = mix(0.055, 0.47, smoothstep(0.04, 0.8, tone));
        float lineInk = 1.0 - smoothstep(lineWidth, lineWidth + 0.055, linePhase);
        lineInk = max(lineInk * step(0.055, tone), step(threshold, tone) * step(0.76, tone));
        ditherInk = lineInk;
      }
      if (uDetailMode == 8) {
        float roundedSize = uDitherPixelSize * uRoundedDotSize *
          mix(1.0, uZoomScale, uRoundedDotScale);
        vec2 roundedPixel = floor(gl_FragCoord.xy / roundedSize);
        float roundedTone = phosphorTone(roundedPixel, roundedSize);
        vec2 roundedUv = fract(gl_FragCoord.xy / roundedSize) - 0.5;
        float radius = min(0.68, sqrt(clamp(roundedTone, 0.0, 1.0) / 3.14159265));
        float circleEdge = max(0.025, 0.8 / roundedSize);
        float circleInk = 1.0 - smoothstep(
          radius - circleEdge,
          radius + circleEdge,
          length(roundedUv)
        );
        vec2 fragmentUv = gl_FragCoord.xy / uResolution;
        float silhouetteCoverage = smoothstep(
          0.12,
          0.88,
          objectMask(texture2D(tDiffuse, fragmentUv).rgb)
        );
        ditherInk = circleInk * step(0.01, roundedTone) * silhouetteCoverage;
        tone = roundedTone;
      }

      vec2 cell = floor(gl_FragCoord.xy / uCellSize);
      vec2 centerPixel = (cell + 0.5) * uCellSize;
      vec2 centerUv = centerPixel / uResolution;
      vec3 cellColor = texture2D(tDiffuse, centerUv).rgb;
      float cellMask = objectMask(cellColor);
      float brightness = clamp(sourceLevel(cellColor) * 1.16, 0.0, 1.0);
      vec2 cellStep = uCellSize / uResolution;
      float horizontalMask = objectMask(texture2D(tDiffuse, centerUv + vec2(cellStep.x, 0.0)).rgb);
      float verticalMask = objectMask(texture2D(tDiffuse, centerUv + vec2(0.0, cellStep.y)).rgb);
      float edge = max(abs(cellMask - horizontalMask), abs(cellMask - verticalMask));
      float dissolveThreshold = texture2D(uBlueNoise, (cell + 0.5) / 16.0).r;
      float density = clamp((1.0 - brightness) * 0.9 + edge * 0.85, 0.0, 1.0);
      float glyphIndex = floor(clamp(density * 5.99 + (dissolveThreshold - 0.5) * 0.65, 0.0, 5.0));
      vec2 localUv = fract(gl_FragCoord.xy / uCellSize);
      float glyphScale = mix(0.9, 1.28, brightness);
      glyphScale = mix(glyphScale, 0.88, edge);
      vec2 glyphUv = (localUv - 0.5) * glyphScale + 0.5;
      float insideGlyph = step(0.0, glyphUv.x) * step(glyphUv.x, 1.0) *
        step(0.0, glyphUv.y) * step(glyphUv.y, 1.0);
      vec2 atlasUv = vec2((glyphIndex + clamp(glyphUv.x, 0.0, 1.0)) / 6.0, clamp(glyphUv.y, 0.0, 1.0));
      float glyph = texture2D(uGlyphAtlas, atlasUv).r;
      float asciiInk = step(0.42, glyph) * insideGlyph * step(0.08, cellMask);

      vec2 screenUv = gl_FragCoord.xy / uResolution;
      float trackingBorder = 0.0;
      float trackingAscii = 0.0;
      vec2 borderWidth = vec2(4.0) / uResolution;

      for (int index = 0; index < 5; index++) {
        vec4 box = uTrackBoxes[index];
        vec2 halfSize = box.zw * 0.5;
        vec2 outerDistance = abs(screenUv - box.xy) - halfSize;
        vec2 innerDistance = abs(screenUv - box.xy) - max(halfSize - borderWidth, vec2(0.0));
        float outer = 1.0 - step(0.0, max(outerDistance.x, outerDistance.y));
        float inner = 1.0 - step(0.0, max(innerDistance.x, innerDistance.y));
        float visibility = uTrackVisibility[index];
        float boxActive = step(0.001, visibility);
        float dissolve = uTrackDissolve[index];
        trackingBorder = max(trackingBorder, outer * (1.0 - inner) * visibility);
        trackingAscii = max(
          trackingAscii,
          outer * boxActive * step(dissolve, dissolveThreshold)
        );
      }

      float useAscii = step(0.5, trackingAscii);
      float ink = mix(ditherInk, asciiInk, useAscii);
      float sourceMask = objectMask(texture2D(tDiffuse, screenUv).rgb);
      float scanline = uDetailMode == 6 || uDetailMode == 8 || uDetailMode == 9
        ? 1.0
        : 0.9 + 0.1 * sin(gl_FragCoord.y * 3.14159265);
      float shimmer = uDetailMode == 9
        ? 0.0
        : (interleavedNoise(ditherPixel + floor(uTime * 7.0)) - 0.5) * 0.025;
      float backgroundNoise = uDetailMode == 9
        ? 0.0
        : step(0.987, interleavedNoise(floor(gl_FragCoord.xy))) *
          (1.0 - sourceMask) * 0.06;
      vec2 vignetteUv = screenUv * 2.0 - 1.0;
      float vignette = 1.0 - smoothstep(0.55, 1.35, dot(vignetteUv, vignetteUv));
      float phosphor = clamp(
        ink * scanline +
        tone * sourceMask * (uDetailMode == 9 ? 0.0 : 0.09) +
        backgroundNoise +
        shimmer * max(ink, sourceMask * 0.16),
        0.0,
        1.0
      );
      phosphor = max(phosphor, trackingBorder * scanline * 0.92);
      phosphor *= mix(0.72, 1.0, vignette);
      vec3 finalColor = mix(uBackground, uBlue, phosphor);
      gl_FragColor = vec4(linearToSrgb(finalColor), 1.0);
    }
  `,
};

const printPass = new ShaderPass(printShader);
frequencyModulationPass.setOutputUniform(printPass.uniforms.tFrequencyPhase);
composer.addPass(frequencyModulationPass);
composer.addPass(printPass);

function setDetailMode(mode) {
  const resolvedMode = Object.hasOwn(DETAIL_MODES, mode) ? mode : "normal";
  printPass.uniforms.uDetailMode.value = DETAIL_MODES[resolvedMode];
  frequencyModulationPass.enabled = resolvedMode === "frequency-modulation";
  if (gtaoPass) gtaoPass.enabled = resolvedMode === "gtao";
  if (roundedDotControls) roundedDotControls.hidden = resolvedMode !== "rounded";
  if (frequencyModulationControls) {
    frequencyModulationControls.hidden = resolvedMode !== "frequency-modulation";
  }
  document.body.dataset.detailMode = resolvedMode;
}

detailModeSelect?.addEventListener("change", (event) => {
  setDetailMode(event.target.value);
});
setDetailMode(detailModeSelect?.value ?? "normal");

function updateRoundedDotSize() {
  const size = Number(roundedDotSizeInput?.value ?? 5);
  printPass.uniforms.uRoundedDotSize.value = size;
  if (roundedDotSizeOutput) roundedDotSizeOutput.value = `${size} px`;
}

roundedDotSizeInput?.addEventListener("input", updateRoundedDotSize);
updateRoundedDotSize();

function updateRoundedDotScale() {
  printPass.uniforms.uRoundedDotScale.value = roundedDotScaleInput?.checked ? 1 : 0;
}

function updateFrequencyModulationControls() {
  const omega = Number(fmOmegaInput?.value ?? 1.05);
  const phase = Number(fmPhaseInput?.value ?? 1.23);
  const quant = Number(fmQuantInput?.value ?? 49);
  const useClahe = fmClaheInput ? (fmClaheInput.checked ? 1 : 0) : 1;
  const negate = fmNegateInput?.checked ? 1 : 0;

  frequencyModulationPass.toneMaterial.uniforms.uOmega.value = omega;
  frequencyModulationPass.toneMaterial.uniforms.uQuantLevel.value = quant;
  frequencyModulationPass.toneMaterial.uniforms.uUseClahe.value = useClahe;
  printPass.uniforms.uPhaseMultiplier.value = phase;
  printPass.uniforms.uFmNegate.value = negate;

  if (fmOmegaOutput) fmOmegaOutput.value = omega.toFixed(2);
  if (fmPhaseOutput) fmPhaseOutput.value = phase.toFixed(2);
  if (fmQuantOutput) fmQuantOutput.value = String(quant);
}

frequencyModulationControls?.addEventListener("input", updateFrequencyModulationControls);
frequencyModulationControls?.addEventListener("change", updateFrequencyModulationControls);
updateFrequencyModulationControls();

roundedDotScaleInput?.addEventListener("change", updateRoundedDotScale);
updateRoundedDotScale();

function frameSpecimen(object) {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const longestSide = Math.max(size.x, size.y, size.z);
  const scale = 4.3 / longestSide;

  object.scale.setScalar(scale);
  object.position.copy(center).multiplyScalar(-scale);

  const orientation = new THREE.Group();
  orientation.rotation.z = -0.1;
  orientation.add(object);

  trackerConfigs.forEach((config) => {
    const anchor = new THREE.Object3D();
    anchor.position.set(...config.position);
    orientation.add(anchor);
    config.anchor = anchor;
  });

  return orientation;
}

const loader = new OBJLoader();
const modelCache = new Map();
let activeSpecimenId = null;
let activeLod = null;
let activeLodTriangles = [];
let activeLodSizes = [];
let loadToken = 0;

function clearSpecimen() {
  while (specimen.children.length > 0) {
    const child = specimen.children[0];
    specimen.remove(child);
    child.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
    });
  }

  trackerConfigs.forEach((config) => {
    config.anchor = null;
  });
}

function positionKey(x, y, z, precision = 1e5) {
  return `${Math.round(x * precision)}:${Math.round(y * precision)}:${Math.round(z * precision)}`;
}

function weldByPosition(geometry, precision = 1e5) {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const sourceIndex = geometry.index;
  const triangleCount = sourceIndex ? sourceIndex.count / 3 : position.count / 3;
  const positions = [];
  const uvs = [];
  const indices = [];
  const map = new Map();

  const resolve = (vertexIndex) => {
    const x = position.getX(vertexIndex);
    const y = position.getY(vertexIndex);
    const z = position.getZ(vertexIndex);
    const key = positionKey(x, y, z, precision);
    const existing = map.get(key);
    if (existing !== undefined) return existing;

    const nextIndex = positions.length / 3;
    positions.push(x, y, z);
    if (uv) uvs.push(uv.getX(vertexIndex), uv.getY(vertexIndex));
    map.set(key, nextIndex);
    return nextIndex;
  };

  for (let face = 0; face < triangleCount; face += 1) {
    const offset = face * 3;
    const a = sourceIndex ? sourceIndex.getX(offset) : offset;
    const b = sourceIndex ? sourceIndex.getX(offset + 1) : offset + 1;
    const c = sourceIndex ? sourceIndex.getX(offset + 2) : offset + 2;
    indices.push(resolve(a), resolve(b), resolve(c));
  }

  const welded = new THREE.BufferGeometry();
  welded.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (uv) welded.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  welded.setIndex(indices);
  return welded;
}

function loopSubdivide(geometry) {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const index = geometry.index;
  if (!index) return geometry;

  const vertexCount = position.count;
  const triangleCount = index.count / 3;
  const adjacency = Array.from({ length: vertexCount }, () => new Set());
  const edgeMap = new Map();
  const edgeKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  const sourcePositions = Array.from({ length: vertexCount }, (_, i) => (
    new THREE.Vector3().fromBufferAttribute(position, i)
  ));
  const sourceUvs = uv
    ? Array.from({ length: vertexCount }, (_, i) => new THREE.Vector2().fromBufferAttribute(uv, i))
    : null;

  for (let face = 0; face < triangleCount; face += 1) {
    const a = index.getX(face * 3);
    const b = index.getX(face * 3 + 1);
    const c = index.getX(face * 3 + 2);
    adjacency[a].add(b).add(c);
    adjacency[b].add(a).add(c);
    adjacency[c].add(a).add(b);

    for (const [u, v, opposite] of [[a, b, c], [b, c, a], [c, a, b]]) {
      const key = edgeKey(u, v);
      let edge = edgeMap.get(key);
      if (!edge) {
        edge = { a: u, b: v, opposites: [] };
        edgeMap.set(key, edge);
      }
      edge.opposites.push(opposite);
    }
  }

  const newPositions = sourcePositions.map((vector) => vector.clone());
  const newUvs = sourceUvs ? sourceUvs.map((vector) => vector.clone()) : null;
  const midpointIndex = new Map();

  edgeMap.forEach((edge, key) => {
    const [v0, v1] = [sourcePositions[edge.a], sourcePositions[edge.b]];
    const point = new THREE.Vector3();
    if (edge.opposites.length === 2) {
      const [o0, o1] = edge.opposites.map((i) => sourcePositions[i]);
      point
        .copy(v0).multiplyScalar(3 / 8)
        .addScaledVector(v1, 3 / 8)
        .addScaledVector(o0, 1 / 8)
        .addScaledVector(o1, 1 / 8);
    } else {
      point.copy(v0).add(v1).multiplyScalar(0.5);
    }

    const nextIndex = newPositions.length;
    newPositions.push(point);
    if (newUvs) {
      newUvs.push(sourceUvs[edge.a].clone().lerp(sourceUvs[edge.b], 0.5));
    }
    midpointIndex.set(key, nextIndex);
  });

  const betaFor = (n) => (n === 3 ? 3 / 16 : 3 / (8 * n));
  for (let i = 0; i < vertexCount; i += 1) {
    const neighbors = [...adjacency[i]];
    const n = neighbors.length;
    if (n === 0) continue;
    const beta = betaFor(n);
    const point = sourcePositions[i].clone().multiplyScalar(1 - beta * n);
    neighbors.forEach((neighbor) => {
      point.addScaledVector(sourcePositions[neighbor], beta);
    });
    newPositions[i] = point;

    if (newUvs) {
      const uvPoint = sourceUvs[i].clone().multiplyScalar(1 - beta * n);
      neighbors.forEach((neighbor) => {
        uvPoint.addScaledVector(sourceUvs[neighbor], beta);
      });
      newUvs[i] = uvPoint;
    }
  }

  const newIndices = [];
  for (let face = 0; face < triangleCount; face += 1) {
    const a = index.getX(face * 3);
    const b = index.getX(face * 3 + 1);
    const c = index.getX(face * 3 + 2);
    const ab = midpointIndex.get(edgeKey(a, b));
    const bc = midpointIndex.get(edgeKey(b, c));
    const ca = midpointIndex.get(edgeKey(c, a));
    newIndices.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
  }

  const subdivided = new THREE.BufferGeometry();
  subdivided.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(newPositions.flatMap((vector) => vector.toArray()), 3),
  );
  if (newUvs) {
    subdivided.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(newUvs.flatMap((vector) => vector.toArray()), 2),
    );
  }
  subdivided.setIndex(newIndices);
  return subdivided;
}

function smoothNormalsByPosition(geometry) {
  const position = geometry.getAttribute("position");
  if (!position) return;

  const index = geometry.index;
  const vertexCount = position.count;
  const normals = new Float32Array(vertexCount * 3);
  const accum = new Map();
  const triangle = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();

  const addNormal = (vertexIndex, normal) => {
    const key = positionKey(
      position.getX(vertexIndex),
      position.getY(vertexIndex),
      position.getZ(vertexIndex),
    );
    let entry = accum.get(key);
    if (!entry) {
      entry = { x: 0, y: 0, z: 0, indices: [] };
      accum.set(key, entry);
    }
    entry.x += normal.x;
    entry.y += normal.y;
    entry.z += normal.z;
    entry.indices.push(vertexIndex);
  };

  const triangleCount = index ? index.count / 3 : vertexCount / 3;
  for (let face = 0; face < triangleCount; face += 1) {
    const a = index ? index.getX(face * 3) : face * 3;
    const b = index ? index.getX(face * 3 + 1) : face * 3 + 1;
    const c = index ? index.getX(face * 3 + 2) : face * 3 + 2;

    triangle[0].fromBufferAttribute(position, a);
    triangle[1].fromBufferAttribute(position, b);
    triangle[2].fromBufferAttribute(position, c);
    edgeA.subVectors(triangle[1], triangle[0]);
    edgeB.subVectors(triangle[2], triangle[0]);
    faceNormal.crossVectors(edgeA, edgeB);
    if (faceNormal.lengthSq() === 0) continue;
    faceNormal.normalize();

    addNormal(a, faceNormal);
    addNormal(b, faceNormal);
    addNormal(c, faceNormal);
  }

  accum.forEach((entry) => {
    const length = Math.hypot(entry.x, entry.y, entry.z) || 1;
    const nx = entry.x / length;
    const ny = entry.y / length;
    const nz = entry.z / length;
    entry.indices.forEach((vertexIndex) => {
      const offset = vertexIndex * 3;
      normals[offset] = nx;
      normals[offset + 1] = ny;
      normals[offset + 2] = nz;
    });
  });

  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.normalizeNormals();
}

function prepareGeometry(mesh, specimenConfig, isLod = false) {
  if (mesh.geometry.userData.smoothed) return;

  const source = mesh.geometry;
  if (isLod || !specimenConfig.smoothNormals) {
    smoothNormalsByPosition(source);
    source.userData.smoothed = true;
    return;
  }

  let geometry = weldByPosition(source);
  geometry = loopSubdivide(geometry);
  geometry = loopSubdivide(geometry);
  smoothNormalsByPosition(geometry);
  geometry.userData.smoothed = true;
  source.dispose();
  mesh.geometry = geometry;
}

function countTriangles(object) {
  let triangles = 0;
  object.traverse((child) => {
    if (!child.isMesh) return;
    const position = child.geometry?.getAttribute("position");
    if (!position) return;
    triangles += child.geometry.index
      ? child.geometry.index.count / 3
      : position.count / 3;
  });
  return Math.round(triangles);
}

function displaySpecimen(entries, specimenConfig, token) {
  if (token !== loadToken) return;

  material.roughness = specimenConfig.roughness ?? 0.72;
  material.metalness = specimenConfig.metalness ?? 0.08;
  material.needsUpdate = true;

  const lod = new THREE.LOD();
  const triangleCounts = [];
  const assetSizes = [];
  entries.forEach(({ object, bytes }, index) => {
    object.traverse((child) => {
      if (child.isMesh) child.material = material;
    });
    triangleCounts.push(countTriangles(object));
    assetSizes.push(bytes);
    lod.addLevel(object, LOD_LEVELS[index].distance);
  });

  clearSpecimen();
  specimen.add(frameSpecimen(lod));
  activeLod = lod;
  activeLodTriangles = triangleCounts;
  activeLodSizes = assetSizes;
  loadingElement.classList.remove("is-error");
  loadingElement.classList.add("is-hidden");
}

function handleModelError(error, label = "specimen") {
  console.error(`Could not load the ${label} model.`, error);
  loadingElement.classList.add("is-error");
  loadingElement.classList.remove("is-hidden");
}

function setActiveOption(specimenId) {
  specimenOptions?.querySelectorAll("[data-specimen]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.specimen === specimenId));
  });
}

function cloneCachedObject(object) {
  const clone = object.clone(true);
  clone.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry = child.geometry.clone();
    }
  });
  return clone;
}

function ensurePrepared(object, config, isLod = false) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    prepareGeometry(child, config, isLod);
  });
  return object;
}

function presentSpecimen(entries, config, token) {
  try {
    entries.forEach(({ object }, index) => ensurePrepared(object, config, index > 0));
  } catch (error) {
    handleModelError(error, config.label);
    return;
  }

  try {
    displaySpecimen(
      entries.map(({ object, bytes }) => ({ object: cloneCachedObject(object), bytes })),
      config,
      token,
    );
  } catch (error) {
    if (token !== loadToken) {
      return;
    }
    handleModelError(error, config.label);
  }
}

function getLodAsset(config, level) {
  const suffix = `_LOD${level}`;
  return {
    path: config.path.replace(/\.obj$/i, `${suffix}.obj`),
    embeddedKey: config.embeddedKey.replace(/__$/, `${suffix}__`),
  };
}

function validateLoadedObject(object, path) {
  if (countTriangles(object) === 0) {
    throw new Error(`The model at ${path} contains no renderable geometry.`);
  }
  return object;
}

function loadObject(path, embeddedKey) {
  const embeddedModel = globalThis[embeddedKey];
  if (typeof embeddedModel === "string") {
    return Promise.resolve({
      object: validateLoadedObject(loader.parse(embeddedModel), path),
      bytes: new Blob([embeddedModel]).size,
    });
  }

  return fetch(path).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Could not load ${path} (${response.status}).`);
    }
    const source = await response.text();
    return {
      object: validateLoadedObject(loader.parse(source), path),
      bytes: new Blob([source]).size,
    };
  });
}

function loadSpecimen(specimenId) {
  const config = SPECIMENS[specimenId];
  if (!config || specimenId === activeSpecimenId) return;

  const token = ++loadToken;
  activeSpecimenId = specimenId;
  setActiveOption(specimenId);
  loadingElement.classList.remove("is-hidden", "is-error");

  const cached = modelCache.get(specimenId);
  if (cached) {
    presentSpecimen(cached, config, token);
    return;
  }

  const assets = [
    { path: config.path, embeddedKey: config.embeddedKey },
    ...LOD_LEVELS.slice(1).map((_, index) => getLodAsset(config, index + 1)),
  ];

  Promise.allSettled(assets.map(({ path, embeddedKey }) => loadObject(path, embeddedKey)))
    .then((results) => {
      if (token !== loadToken) return;

      if (results[0].status === "rejected") {
        throw results[0].reason;
      }

      const entries = [];
      for (const result of results) {
        if (result.status === "rejected") break;
        entries.push(result.value);
      }

      modelCache.set(specimenId, entries);
      presentSpecimen(entries, config, token);
    })
    .catch((error) => {
      if (token !== loadToken) return;
      if (activeSpecimenId === specimenId) activeSpecimenId = null;
      handleModelError(error, config.label);
    });
}

specimenOptions?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-specimen]");
  if (!button) return;
  loadSpecimen(button.dataset.specimen);
});

loadSpecimen("bacteriophage");

function updateSize() {
  const width = sceneElement.clientWidth;
  const height = sceneElement.clientHeight;
  const pixelRatio = renderer.getPixelRatio();

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  normalTarget.setSize(width * pixelRatio, height * pixelRatio);
  frequencyModulationPass.setSize(width * pixelRatio, height * pixelRatio);
  printPass.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  printPass.uniforms.uCellSize.value.set(5 * pixelRatio, 7 * pixelRatio);
  printPass.uniforms.uDitherPixelSize.value = pixelRatio;
}

const resizeObserver = new ResizeObserver(updateSize);
resizeObserver.observe(sceneElement);
updateSize();

const clock = new THREE.Clock();
const triangleFormatter = new Intl.NumberFormat("en-US");
const lodWorldPosition = new THREE.Vector3();
const cameraWorldPosition = new THREE.Vector3();
let fpsFrameCount = 0;
let fpsElapsed = 0;
let displayedFps = 0;
let metricsElapsed = 0;

function updatePerformanceMetrics(delta) {
  fpsFrameCount += 1;
  fpsElapsed += delta;
  metricsElapsed += delta;

  if (fpsElapsed >= 0.5) {
    displayedFps = Math.round(fpsFrameCount / fpsElapsed);
    fpsFrameCount = 0;
    fpsElapsed = 0;
  }

  if (!activeLod || metricsElapsed < 0.15) return;
  metricsElapsed = 0;

  const level = Math.min(activeLod.getCurrentLevel(), activeLodTriangles.length - 1);
  activeLod.getWorldPosition(lodWorldPosition);
  camera.getWorldPosition(cameraWorldPosition);
  const distance = cameraWorldPosition.distanceTo(lodWorldPosition);
  const sizeInMb = (activeLodSizes[level] ?? 0) / 1_000_000;

  metrics.triangles.textContent = triangleFormatter.format(activeLodTriangles[level] ?? 0);
  metrics.size.textContent = `${sizeInMb.toFixed(sizeInMb < 1 ? 2 : 1)} MB`;
  metrics.lod.textContent = LOD_LEVELS[level]?.label ?? String(level);
  metrics.distance.textContent = `${distance.toFixed(1)} m`;
  metrics.fps.textContent = displayedFps ? String(displayedFps) : "—";
  metrics.drawCalls.textContent = String(renderer.info.render.calls);
}

function smootherstep(progress) {
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function getTrackerVisibility(config, time) {
  const localTime = (time + config.phase) % config.period;
  const fadeDuration = 0.7;
  const visibleUntil = config.period * 0.56;

  if (localTime < fadeDuration) return smootherstep(localTime / fadeDuration);
  if (localTime < visibleUntil) return 1;
  if (localTime < visibleUntil + fadeDuration) {
    return 1 - smootherstep((localTime - visibleUntil) / fadeDuration);
  }

  return 0;
}

function getTrackerDissolve(config, time) {
  const localTime = (time + config.phase) % config.period;
  const fadeDuration = 0.7;
  const visibleUntil = config.period * 0.56;

  if (localTime < visibleUntil) return 0;
  if (localTime < visibleUntil + fadeDuration) {
    return smootherstep((localTime - visibleUntil) / fadeDuration);
  }
  return 1;
}

function updateTrackingBoxes(time) {
  const width = sceneElement.clientWidth;
  const height = sceneElement.clientHeight;
  const animationTime = time * 0.72;

  trackerConfigs.forEach((config, index) => {
    if (!config.anchor || width === 0 || height === 0) {
      trackingBoxes[index].set(-2, -2, 0, 0);
      trackingVisibility[index] = 0;
      trackingDissolve[index] = 1;
      return;
    }

    const visibility = getTrackerVisibility(config, animationTime);
    trackingVisibility[index] = visibility;
    trackingDissolve[index] = getTrackerDissolve(config, animationTime);
    config.anchor.getWorldPosition(projectedTrackerPosition);
    projectedTrackerPosition.project(camera);

    const motionX = Math.sin(animationTime * 0.72 + config.phase) * config.movement[0];
    const motionY = Math.cos(animationTime * 0.58 + config.phase * 1.37) * config.movement[1];
    const localTime = (animationTime + config.phase) % config.period;
    const growthProgress = Math.min(localTime / (config.period * 0.56), 1);
    const growth = 0.82 + smootherstep(growthProgress) * 0.38;
    const sizePulse = growth + Math.sin(animationTime * 0.44 + config.phase) * 0.025;
    const centerX = projectedTrackerPosition.x * 0.5 + 0.5 + motionX / width;
    const centerY = projectedTrackerPosition.y * 0.5 + 0.5 + motionY / height;
    trackingBoxes[index].set(
      centerX,
      centerY,
      (config.size[0] * sizePulse) / width,
      (config.size[1] * sizePulse) / height,
    );
  });
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  printPass.uniforms.uTime.value = clock.elapsedTime;
  if (isRotating) specimen.rotation.y += delta * 0.42;
  controls.update();
  const cameraDistance = camera.position.distanceTo(controls.target);
  printPass.uniforms.uZoomScale.value = THREE.MathUtils.clamp(
    referenceCameraDistance / cameraDistance,
    referenceCameraDistance / controls.maxDistance,
    referenceCameraDistance / controls.minDistance,
  );
  updateTrackingBoxes(clock.elapsedTime);
  scene.overrideMaterial = normalMaterial;
  renderer.setRenderTarget(normalTarget);
  renderer.clear();
  renderer.render(scene, camera);
  scene.overrideMaterial = null;
  renderer.setRenderTarget(null);
  composer.render();
  updatePerformanceMetrics(delta);
}

renderer.setAnimationLoop(animate);
