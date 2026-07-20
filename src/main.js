import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import "./style.css";

const COLORS = {
  beige: new THREE.Color("#faf6ec"),
  blue: new THREE.Color("#0d42f0"),
};

const sceneElement = document.querySelector("#scene");
const loadingElement = document.querySelector("#loading");
const specimenOptions = document.querySelector("#specimen-options");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
};

const scene = new THREE.Scene();
scene.background = COLORS.beige;

const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
camera.position.set(6.4, 2.4, 7.7);

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

const isRotating = !prefersReducedMotion.matches;

scene.add(new THREE.HemisphereLight("#f8f1df", "#06205f", 3.2));

const keyLight = new THREE.DirectionalLight("#ffffff", 5.4);
keyLight.position.set(-4, 6, 7);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight("#628cff", 4);
rimLight.position.set(5, 1, -5);
scene.add(rimLight);

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
const projectedTrackerPosition = new THREE.Vector3();

const material = new THREE.MeshStandardMaterial({
  color: COLORS.blue,
  roughness: SPECIMENS.bacteriophage.roughness,
  metalness: SPECIMENS.bacteriophage.metalness,
  flatShading: false,
});

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

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
  const points = [];
  let nextPoint = Math.floor(count / 2);

  for (let rank = 0; rank < count; rank += 1) {
    if (rank > 0) {
      let bestDistance = -1;

      for (let candidate = 0; candidate < count; candidate += 1) {
        if (selected[candidate]) continue;

        const x = candidate % size;
        const y = Math.floor(candidate / size);
        let nearestDistance = Infinity;

        points.forEach((point) => {
          const pointX = point % size;
          const pointY = Math.floor(point / size);
          const dx = Math.min(Math.abs(x - pointX), size - Math.abs(x - pointX));
          const dy = Math.min(Math.abs(y - pointY), size - Math.abs(y - pointY));
          nearestDistance = Math.min(nearestDistance, dx * dx + dy * dy);
        });

        if (nearestDistance > bestDistance) {
          bestDistance = nearestDistance;
          nextPoint = candidate;
        }
      }
    }

    selected[nextPoint] = 1;
    points.push(nextPoint);
    ranks[nextPoint] = Math.round(((rank + 1) / (count + 1)) * 255);
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
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCellSize: { value: new THREE.Vector2(9, 14) },
    uDitherPixelSize: { value: 1.38 },
    uTime: { value: 0 },
    uTrackBoxes: { value: trackingBoxes },
    uTrackVisibility: { value: trackingVisibility },
    uGlyphAtlas: { value: createGlyphAtlas() },
    uBlueNoise: { value: createBlueNoiseTexture() },
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
    uniform sampler2D uGlyphAtlas;
    uniform sampler2D uBlueNoise;
    uniform vec2 uResolution;
    uniform vec2 uCellSize;
    uniform float uDitherPixelSize;
    uniform float uTime;
    uniform vec4 uTrackBoxes[5];
    uniform float uTrackVisibility[5];
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

    float atkinsonTone(vec2 pixel, float pixelSize) {
      vec2 sampleUv = ((pixel + 0.5) * pixelSize) / uResolution;
      vec3 sampleColor = texture2D(tDiffuse, sampleUv).rgb;
      float mask = objectMask(sampleColor);
      float brightness = smoothstep(0.04, 0.95, sampleColor.b);
      return mask * clamp(0.16 + brightness * 0.7, 0.0, 1.0);
    }

    float quantizationError(vec2 pixel, float pixelSize) {
      float tone = atkinsonTone(pixel, pixelSize);
      return tone - step(0.5, tone);
    }

    void main() {
      float pixelSize = max(1.0, uDitherPixelSize);
      vec2 ditherPixel = floor(gl_FragCoord.xy / pixelSize);
      float tone = atkinsonTone(ditherPixel, pixelSize);
      float propagatedError =
        quantizationError(ditherPixel + vec2(-1.0, 0.0), pixelSize) +
        quantizationError(ditherPixel + vec2(-2.0, 0.0), pixelSize) +
        quantizationError(ditherPixel + vec2(1.0, -1.0), pixelSize) +
        quantizationError(ditherPixel + vec2(0.0, -1.0), pixelSize) +
        quantizationError(ditherPixel + vec2(-1.0, -1.0), pixelSize) +
        quantizationError(ditherPixel + vec2(0.0, -2.0), pixelSize);
      float correctedTone = clamp(tone + propagatedError * 0.125, 0.0, 1.0);
      float threshold = mix(0.5, interleavedNoise(ditherPixel), 0.62);
      float ditherInk = step(threshold, correctedTone) * step(0.01, tone);

      vec2 cell = floor(gl_FragCoord.xy / uCellSize);
      vec2 centerPixel = (cell + 0.5) * uCellSize;
      vec2 centerUv = centerPixel / uResolution;
      vec3 cellColor = texture2D(tDiffuse, centerUv).rgb;
      float cellMask = objectMask(cellColor);
      float brightness = clamp(cellColor.b * 1.16, 0.0, 1.0);
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
      float trackingInside = 0.0;
      float trackingBorder = 0.0;
      vec2 borderWidth = vec2(4.0) / uResolution;

      for (int index = 0; index < 5; index++) {
        vec4 box = uTrackBoxes[index];
        vec2 halfSize = box.zw * 0.5;
        vec2 outerDistance = abs(screenUv - box.xy) - halfSize;
        vec2 innerDistance = abs(screenUv - box.xy) - max(halfSize - borderWidth, vec2(0.0));
        float outer = 1.0 - step(0.0, max(outerDistance.x, outerDistance.y));
        float inner = 1.0 - step(0.0, max(innerDistance.x, innerDistance.y));
        float visibility = uTrackVisibility[index];
        trackingInside = max(trackingInside, outer * visibility);
        trackingBorder = max(trackingBorder, outer * (1.0 - inner) * visibility);
      }

      float localBlend = trackingInside * 0.9;
      float useAscii = step(dissolveThreshold, localBlend);
      float ink = mix(ditherInk, asciiInk, useAscii);
      float sourceMask = objectMask(texture2D(tDiffuse, screenUv).rgb);
      float scanline = 0.92 + 0.08 * sin(gl_FragCoord.y * 3.14159265 / (uDitherPixelSize * 1.35));
      float shimmer = (interleavedNoise(floor(gl_FragCoord.xy / uDitherPixelSize) + floor(uTime * 9.0)) - 0.5) * 0.035;
      float backgroundNoise = step(
        0.982,
        interleavedNoise(floor(gl_FragCoord.xy / (uDitherPixelSize * 1.15)))
      ) * (1.0 - sourceMask) * 0.13;
      float phosphor = clamp(
        ink * scanline +
        backgroundNoise +
        shimmer * max(ink, sourceMask * 0.16),
        0.0,
        1.0
      );
      phosphor = max(phosphor, trackingBorder * scanline * 0.92);
      vec3 finalColor = mix(uBackground, uBlue, phosphor);
      gl_FragColor = vec4(linearToSrgb(finalColor), 1.0);
    }
  `,
};

const printPass = new ShaderPass(printShader);
composer.addPass(printPass);

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

function prepareGeometry(mesh, specimenConfig) {
  if (!specimenConfig.smoothNormals) {
    if (!mesh.geometry.userData.smoothed) {
      mesh.geometry.computeVertexNormals();
      mesh.geometry.userData.smoothed = true;
    }
    return;
  }

  if (mesh.geometry.userData.smoothed) return;

  const source = mesh.geometry;
  let geometry = weldByPosition(source);
  geometry = loopSubdivide(geometry);
  geometry = loopSubdivide(geometry);
  smoothNormalsByPosition(geometry);
  geometry.userData.smoothed = true;
  source.dispose();
  mesh.geometry = geometry;
}

async function displaySpecimen(object, specimenConfig, token) {
  if (token !== loadToken) return;

  material.roughness = specimenConfig.roughness ?? 0.72;
  material.metalness = specimenConfig.metalness ?? 0.08;
  material.needsUpdate = true;

  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
  });

  clearSpecimen();
  specimen.add(frameSpecimen(object));
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

function ensurePrepared(object, config) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    prepareGeometry(child, config);
  });
  return object;
}

function presentSpecimen(object, config, token) {
  try {
    ensurePrepared(object, config);
  } catch (error) {
    handleModelError(error, config.label);
    return;
  }

  displaySpecimen(cloneCachedObject(object), config, token).catch((error) => {
    if (token !== loadToken) return;
    handleModelError(error, config.label);
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

  const embeddedModel = globalThis[config.embeddedKey];
  if (typeof embeddedModel === "string") {
    try {
      const parsed = loader.parse(embeddedModel);
      modelCache.set(specimenId, parsed);
      if (token !== loadToken) return;
      presentSpecimen(parsed, config, token);
    } catch (error) {
      if (token !== loadToken) return;
      handleModelError(error, config.label);
    }
    return;
  }

  loader.load(
    config.path,
    (object) => {
      modelCache.set(specimenId, object);
      if (token !== loadToken) return;
      presentSpecimen(object, config, token);
    },
    undefined,
    (error) => {
      if (token !== loadToken) return;
      if (activeSpecimenId === specimenId) activeSpecimenId = null;
      handleModelError(error, config.label);
    },
  );
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
  printPass.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  printPass.uniforms.uCellSize.value.set(5 * pixelRatio, 7 * pixelRatio);
  printPass.uniforms.uDitherPixelSize.value = 1.38 * pixelRatio;
}

const resizeObserver = new ResizeObserver(updateSize);
resizeObserver.observe(sceneElement);
updateSize();

const clock = new THREE.Clock();

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

function updateTrackingBoxes(time) {
  const width = sceneElement.clientWidth;
  const height = sceneElement.clientHeight;
  const animationTime = time * 0.72;

  trackerConfigs.forEach((config, index) => {
    if (!config.anchor || width === 0 || height === 0) {
      trackingBoxes[index].set(-2, -2, 0, 0);
      return;
    }

    const visibility = getTrackerVisibility(config, animationTime);
    trackingVisibility[index] = visibility;
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
  updateTrackingBoxes(clock.elapsedTime);
  composer.render();
}

renderer.setAnimationLoop(animate);
