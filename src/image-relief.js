import { GIFEncoder, applyPalette, quantize } from "gifenc";
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
} from "mediabunny";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css?v=panel-scroll";
import conidiaUrl from "./conidia.jpg?url";

const COLORS = {
  blue: new THREE.Color("#0d42f0"),
};
const SCREEN_BLUE = COLORS.blue.clone().convertLinearToSRGB();

const IMAGE_SOURCES = {
  antibody: {
    id: "antibody",
    label: "Antibody",
    path: "/images/antibody-print.png",
    refineDetail: true,
    refineLuma: 0.38,
    refineContrast: 0.11,
  },
  shiba: {
    id: "shiba",
    label: "Cheems",
    path: "/images/shiba.png",
    cellSize: 3,
    depth: 2.3,
    refineDetail: true,
    refineLuma: 0.05,
    refineContrast: 0.12,
    skipLuma: 0.73,
    skipChroma: 0.012,
    refineScale: 0.28,
    sizeFloor: 0.05,
    toneGamma: 0.82,
    keepAll: true,
    softCurve: true,
    depthScale: 0.8,
  },
  face: {
    id: "face",
    label: "Petri",
    path: "/images/face.jpg",
    cellSize: 2,
    depth: 1.75,
    dotScale: 1,
    sizeFloor: 0.18,
    depthScale: 0.85,
    refineDetail: true,
    refineLuma: 0.59,
    refineContrast: 0.3,
    refineScale: 0.2,
    skipLuma: 0.08,
    skipChroma: 0.025,
    minNeighbors: 2,
    minInk: 0.004,
    invert: true,
    toneGamma: 0.74,
    stretchTone: true,
    keepAll: true,
    softCurve: true,
    frontCull: 0,
    backCull: 0.9,
    orbit: false,
    flatHalftone: true,
    dotColor: "#0d42f0",
    background: "#f3f3f3",
  },
  conidia: {
    id: "conidia",
    label: "Conidia",
    path: conidiaUrl,
    cellSize: 2,
    invert: false,
    skipLuma: 0.94,
    skipChroma: 0.04,
    minNeighbors: 2,
    minInk: 0.01,
    keepAll: false,
    softCurve: true,
    stretchTone: true,
    toneGamma: 0.9,
  },
  flower: {
    id: "flower",
    label: "Flower color",
    path: "/images/flower-color.png",
    cellSize: 2,
    depth: 1.8,
    dotScale: 1,
    dotColor: "#0d42f0",
    background: "#f3f3f3",
    invert: false,
    refineDetail: true,
    refineLuma: 0.05,
    refineContrast: 0.09,
    skipLuma: 0.2,
    skipChroma: 0.05,
    refineScale: 0.1,
    sizeFloor: 0.05,
    toneGamma: 0.3,
    minInk: 0.017,
    minNeighbors: 3,
    stretchTone: true,
    keepAll: false,
    softCurve: true,
    depthScale: 1,
  },
  intestine: {
    id: "intestine",
    label: "Intestine",
    path: "/images/intestine.jpg",
    cellSize: 2,
    depth: 1.7,
    invert: false,
    refineDetail: true,
    skipLuma: 0.82,
    skipChroma: 0.02,
    minNeighbors: 1,
    minInk: 0.005,
    stretchTone: true,
    keepAll: false,
    softCurve: true,
    toneGamma: 0.82,
    sizeFloor: 0.1,
    depthScale: 1,
    dotColor: "#0d42f0",
    background: "#f3f3f3",
  },
};
const LOCKED_IMAGE = document.documentElement.dataset.reliefImage || null;
const FACE_UPLOAD_ID = "upload-36f79d59-ddc0-4e3b-8c7f-839baadc04ec";
const FACE_UPLOAD_NAME = "6091660e-6019-449e-9e65-58af947e1916";
const userSources = new Map();
const thumbnailUrlCache = new Map();
const thumbnailPromiseCache = new Map();
const UPLOAD_DB_NAME = "image-relief";
const UPLOAD_STORE = "uploads";
const ACTIVE_IMAGE_KEY = LOCKED_IMAGE
  ? `image-relief:active-image:${LOCKED_IMAGE}`
  : "image-relief:active-image";
const SETTINGS_KEY = LOCKED_IMAGE
  ? `image-relief:settings:${LOCKED_IMAGE}`
  : "image-relief:settings";
const MAX_UPLOAD_EDGE = 2048;
const THUMBNAIL_SIZE = 72;
const THUMBNAIL_PADDING = 6;
const THUMBNAIL_SAMPLE_SCALE = 5;
const THUMBNAIL_MIN_CELL = 8;
const WORLD_HEIGHT = 4.6;
const VIEW_HEIGHT = 5.4;
const PAGE_CREAM = "#fafafa";
const VIEWER_FILL = "#f3f3f3";
const VIDEO_EXPORT = {
  fps: 30,
  duration: 14,
  maxEdge: 2560,
  gifMaxEdge: 1280,
  format: "webm",
};
const EXPORT_SIZES = {
  square: { id: "square", width: 1080, height: 1080 },
  wide: { id: "wide", width: 1130, height: 600 },
};
const MAX_REGIONS = 5;
const ASCII_SCALE = 3;
const ASCII_GLYPH_COLUMNS = 4;
const ASCII_GLYPH_ROWS = 7;
const ASCII_CELL_WIDTH = 8;
const ASCII_CELL_HEIGHT = 12;
const ASCII_GLYPHS = [
  ["..#.", ".##.", "..#.", "..#.", "..#.", "..#.", ".###"],
  ["####", ".#..", ".#..", ".#..", ".#..", ".#..", ".#.."],
  [".##.", "#..#", "#...", "#...", "#...", "#..#", ".##."],
  [".#..", "#.#.", "#.#.", "####", "#..#", "#..#", "#..#"],
  [".##.", "#..#", "#..#", "#..#", "#..#", "#..#", ".##."],
  [".##.", "#..#", "#...", "#.##", "#..#", "#..#", ".##."],
];
const ASCII_GLYPH_RATE = 2;
const BANNER_EXPORT = {
  dpi: 150,
  longEdgeInches: 72,
  maxPixels: 90_000_000,
  fallbackEdges: [10800, 8192, 6144, 4096],
};
const EXPORT_FORMATS = {
  gif: {
    id: "gif",
    mime: "image/gif",
    extension: "gif",
  },
  webm: {
    id: "webm",
    mime: "video/webm",
    extension: "webm",
    format: () => new WebMOutputFormat(),
    codecs: ["vp9", "vp8"],
  },
  mp4: {
    id: "mp4",
    mime: "video/mp4",
    extension: "mp4",
    format: () => new Mp4OutputFormat({ fastStart: "in-memory" }),
    codecs: ["avc", "hevc"],
  },
  png: {
    id: "png",
    mime: "image/png",
    extension: "png",
    still: true,
  },
};
const RELIEF_DEFAULTS = {
  "cell-size": 3,
  depth: 1.6,
  "dot-scale": 1.0,
  "refine-contrast": 0.11,
  "refine-scale": 0.22,
  "skip-chroma": 0.03,
  "min-ink": 0.006,
  "show-metrics": false,
  "front-cull": 0,
  "back-cull": 0.9,
  "export-duration": 14,
  "export-fps": 30,
  "dot-color": "#0d42f0",
  background: VIEWER_FILL,
};
const ORBIT_EASE = {
  holdSeconds: 1.6,
  halfTurnSeconds: 6.5,
};

const sceneElement = document.querySelector("#scene");
const loadingElement = document.querySelector("#loading");
const reliefControls = document.querySelector(".light-controls");
const performancePanel = document.querySelector(".performance-panel");
const exportVideoButton = document.querySelector("[data-export-video]");
const exportLabel = document.querySelector("[data-export-label]");
const exportCopy = document.querySelector("[data-export-copy]");
const exportStatus = document.querySelector("[data-export-status]");
const exportPercent = document.querySelector("[data-export-percent]");
const exportBar = document.querySelector("[data-export-bar]");
const exportFill = document.querySelector("[data-export-fill]");

function setExportProgress(percent, active, copy = "Exporting") {
  const amount = THREE.MathUtils.clamp(Math.round(percent), 0, 100);
  if (exportStatus) {
    exportStatus.hidden = !active;
    exportStatus.classList.toggle("is-active", active);
  }
  if (exportCopy) {
    exportCopy.innerHTML = `${copy}<span class="light-controls__ellipsis" aria-hidden="true"></span>`;
  }
  if (exportPercent) exportPercent.textContent = `${amount}%`;
  if (exportBar) exportBar.setAttribute("aria-valuenow", String(amount));
  if (exportFill) exportFill.style.width = `${amount}%`;
}
const imageOptions = document.querySelector("#image-options");
const compactImageOptions = document.querySelector("#compact-image-options");
const uploadImageButton = document.querySelector("[data-upload-image]");
const uploadImageInput = document.querySelector("[data-upload-input]");
const metricPoints = document.querySelector("#metric-points");
const metricGrid = document.querySelector("#metric-grid");
const metricRotation = document.querySelector("#metric-rotation");
const metricFps = document.querySelector("#metric-fps");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
camera.position.set(0, 0, 16);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneElement.clientWidth, sceneElement.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
sceneElement.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minZoom = 0.7;
controls.maxZoom = 2.4;
controls.minPolarAngle = Math.PI * 0.45;
controls.maxPolarAngle = Math.PI * 0.55;
controls.target.set(0, 0, -0.8);
const pageParams = new URLSearchParams(window.location.search);
const orbitEnabled = !prefersReducedMotion.matches && !pageParams.has("still");
controls.autoRotate = false;
controls.addEventListener("start", () => {
  userOrbiting = true;
});
controls.addEventListener("end", () => {
  userOrbiting = false;
  if (orbitEnabled) syncOrbitFromCamera();
});
const field = new THREE.Group();
scene.add(field);
const regionBoxes = Array.from({ length: MAX_REGIONS }, () => new THREE.Vector4(-2, -2, 0, 0));
const manualRegions = [];
let drawingRegions = false;
let regionOverlay = null;
let regionOverlayContext = null;
let fieldGrid = null;
const overlayViewProjection = new THREE.Matrix4();
const overlayViewProjectionInverse = new THREE.Matrix4();

function createGlyphAtlas(scale = 8) {
  const padding = 2 * scale;
  const cellWidth = (ASCII_GLYPH_COLUMNS + 2) * scale + padding * 2;
  const cellHeight = (ASCII_GLYPH_ROWS + 2) * scale + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * ASCII_GLYPHS.length;
  canvas.height = cellHeight;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  ASCII_GLYPHS.forEach((pattern, glyphIndex) => {
    pattern.forEach((line, row) => {
      [...line].forEach((bit, column) => {
        if (bit !== "#") return;
        context.fillRect(
          glyphIndex * cellWidth + padding + column * scale,
          padding + row * scale,
          scale,
          scale,
        );
      });
    });
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: true,
});
const overlayMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: null },
    uGlyphAtlas: { value: createGlyphAtlas() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uGlyphCellSize: { value: new THREE.Vector2(ASCII_CELL_WIDTH, ASCII_CELL_HEIGHT) },
    uBoxes: { value: regionBoxes },
    uBoxCount: { value: 0 },
    uInk: { value: SCREEN_BLUE.clone() },
    uPaper: { value: new THREE.Color(VIEWER_FILL) },
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D uGlyphAtlas;
    uniform vec2 uResolution;
    uniform vec2 uGlyphCellSize;
    uniform vec4 uBoxes[5];
    uniform float uBoxCount;
    uniform vec3 uInk;
    uniform vec3 uPaper;

    float hash(vec2 value) {
      return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      vec3 source = texture2D(tDiffuse, uv).rgb;
      float inkness = clamp(distance(source, uPaper) / max(distance(uInk, uPaper), 0.04), 0.0, 1.0);
      vec2 borderWidth = vec2(2.0) / uResolution;
      float inside = 0.0;
      float border = 0.0;

      for (int index = 0; index < 5; index += 1) {
        if (float(index) >= uBoxCount) break;
        vec4 box = uBoxes[index];
        vec2 halfSize = box.zw * 0.5;
        vec2 outerDistance = abs(uv - box.xy) - halfSize;
        vec2 innerDistance = abs(uv - box.xy) - max(halfSize - borderWidth, vec2(0.0));
        float outer = 1.0 - step(0.0, max(outerDistance.x, outerDistance.y));
        float inner = 1.0 - step(0.0, max(innerDistance.x, innerDistance.y));
        inside = max(inside, outer);
        border = max(border, outer * (1.0 - inner));
      }

      vec2 cell = floor(gl_FragCoord.xy / uGlyphCellSize);
      vec2 localUv = fract(gl_FragCoord.xy / uGlyphCellSize);
      vec3 paperGap = max(distance(uInk, uPaper), 0.04);
      float cellInk = 0.0;
      cellInk = max(cellInk, clamp(distance(texture2D(tDiffuse, (cell + vec2(0.25, 0.25)) * uGlyphCellSize / uResolution).rgb, uPaper) / paperGap, 0.0, 1.0));
      cellInk = max(cellInk, clamp(distance(texture2D(tDiffuse, (cell + vec2(0.75, 0.25)) * uGlyphCellSize / uResolution).rgb, uPaper) / paperGap, 0.0, 1.0));
      cellInk = max(cellInk, clamp(distance(texture2D(tDiffuse, (cell + vec2(0.25, 0.75)) * uGlyphCellSize / uResolution).rgb, uPaper) / paperGap, 0.0, 1.0));
      cellInk = max(cellInk, clamp(distance(texture2D(tDiffuse, (cell + vec2(0.75, 0.75)) * uGlyphCellSize / uResolution).rgb, uPaper) / paperGap, 0.0, 1.0));
      float glyphIndex = floor(clamp(cellInk * 5.99 + (hash(cell) - 0.5) * 0.55, 0.0, 5.0));
      vec2 atlasUv = vec2((glyphIndex + localUv.x) / 6.0, localUv.y);
      float glyph = texture2D(uGlyphAtlas, atlasUv).r;
      float ascii = step(0.22, glyph) * inside * step(0.05, max(cellInk, inkness));
      vec3 base = mix(source, uPaper, inside * (1.0 - border));
      vec3 color = mix(base, uInk, max(ascii, border));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
const overlayScene = new THREE.Scene();
const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial));

function refreshGlyphAtlas() {
  const previous = overlayMaterial.uniforms.uGlyphAtlas.value;
  overlayMaterial.uniforms.uGlyphAtlas.value = createGlyphAtlas();
  previous?.dispose();
}

document.fonts?.ready?.then(refreshGlyphAtlas);

function syncRegionUniforms() {
  for (let index = 0; index < MAX_REGIONS; index += 1) {
    const box = manualRegions[index];
    if (box) regionBoxes[index].copy(box);
    else regionBoxes[index].set(-2, -2, 0, 0);
  }
  overlayMaterial.uniforms.uBoxCount.value = manualRegions.length;
}

function syncRegionUi() {
  const drawButton = document.querySelector("[data-draw-regions]");
  const clearButton = document.querySelector("[data-clear-regions]");
  const hint = document.querySelector("[data-region-hint]");
  drawButton?.setAttribute("aria-pressed", String(drawingRegions));
  if (drawButton) drawButton.textContent = drawingRegions ? "Drawing" : "Draw regions";
  if (clearButton) clearButton.disabled = manualRegions.length === 0;
  if (hint) {
    hint.textContent = drawingRegions
      ? "Drag on the field. Boxes stay in view and exports."
      : manualRegions.length
        ? `${manualRegions.length} region${manualRegions.length === 1 ? "" : "s"} active.`
        : "Draw boxes on the field to overlay 1 T C A 0 G.";
  }
}

function setupRegionDrawing() {
  const drawButton = document.querySelector("[data-draw-regions]");
  const clearButton = document.querySelector("[data-clear-regions]");
  if (!drawButton || !sceneElement) return;

  regionOverlay = document.createElement("canvas");
  regionOverlay.className = "region-overlay";
  regionOverlay.setAttribute("aria-hidden", "true");
  regionOverlayContext = regionOverlay.getContext("2d");
  regionOverlayContext.imageSmoothingEnabled = false;
  sceneElement.append(regionOverlay);

  const layer = document.createElement("div");
  layer.className = "tracking-draw-layer";
  layer.setAttribute("aria-hidden", "true");
  sceneElement.append(layer);
  let drag = null;

  const pointInLayer = (event) => {
    const bounds = layer.getBoundingClientRect();
    return {
      x: THREE.MathUtils.clamp(event.clientX - bounds.left, 0, bounds.width),
      y: THREE.MathUtils.clamp(event.clientY - bounds.top, 0, bounds.height),
      width: bounds.width,
      height: bounds.height,
    };
  };

  const updatePreview = (point) => {
    if (!drag) return;
    Object.assign(drag.preview.style, {
      left: `${Math.min(drag.start.x, point.x)}px`,
      top: `${Math.min(drag.start.y, point.y)}px`,
      width: `${Math.abs(point.x - drag.start.x)}px`,
      height: `${Math.abs(point.y - drag.start.y)}px`,
    });
  };

  layer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = pointInLayer(event);
    const preview = document.createElement("div");
    preview.className = "tracking-draw-preview";
    layer.append(preview);
    drag = { pointerId: event.pointerId, start, preview };
    try {
      layer.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events may not support capture.
    }
    updatePreview(start);
  });

  layer.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    updatePreview(pointInLayer(event));
  });

  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const end = pointInLayer(event);
    const left = Math.min(drag.start.x, end.x);
    const top = Math.min(drag.start.y, end.y);
    const width = Math.abs(end.x - drag.start.x);
    const height = Math.abs(end.y - drag.start.y);
    drag.preview.remove();
    drag = null;
    if (width < 8 || height < 8 || end.width <= 0 || end.height <= 0) return;
    if (manualRegions.length === MAX_REGIONS) manualRegions.shift();
    manualRegions.push(new THREE.Vector4(
      (left + width * 0.5) / end.width,
      1 - (top + height * 0.5) / end.height,
      width / end.width,
      height / end.height,
    ));
    syncRegionUniforms();
    syncRegionUi();
    drawLiveRegionOverlay();
  };

  layer.addEventListener("pointerup", finishDrag);
  layer.addEventListener("pointercancel", finishDrag);

  drawButton.addEventListener("click", () => {
    drawingRegions = !drawingRegions;
    layer.classList.toggle("is-active", drawingRegions);
    controls.enabled = !drawingRegions;
    syncRegionUi();
  });

  clearButton?.addEventListener("click", () => {
    manualRegions.length = 0;
    syncRegionUniforms();
    syncRegionUi();
    drawLiveRegionOverlay();
  });

  syncRegionUi();
}
let isExportingVideo = false;

const pointMaterial = new THREE.ShaderMaterial({
  transparent: false,
  depthTest: true,
  depthWrite: true,
  uniforms: {
    uColor: { value: SCREEN_BLUE },
    uDotScale: { value: RELIEF_DEFAULTS["dot-scale"] },
    uMinPointSize: { value: 1.2 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uViewportHeight: { value: 1 },
    uZoom: { value: 1 },
  },
  vertexShader: `
    attribute float aSize;
    uniform float uDotScale;
    uniform float uMinPointSize;
    uniform float uPixelRatio;
    uniform float uViewportHeight;
    uniform float uZoom;

    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      float pixelSize = aSize * uDotScale * uPixelRatio * uViewportHeight * uZoom;
      if (pixelSize < uMinPointSize) {
        gl_PointSize = 0.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
      gl_PointSize = pixelSize;
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;

    void main() {
      vec2 offset = gl_PointCoord * 2.0 - 1.0;
      if (dot(offset, offset) > 0.92) discard;
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
});

const clock = new THREE.Clock();
const pointFormatter = new Intl.NumberFormat("en-US");
const imageCache = new Map();
let activeImageId = null;
let sourceImage = null;
let loadToken = 0;
let pointCount = 0;
let gridLabel = "—";
let fpsFrameCount = 0;
let fpsElapsed = 0;
let displayedFps = 0;
let displayedRotation = null;
let points = null;
let userOrbiting = false;
let orbitMode = "hold";
let orbitHoldRemaining = ORBIT_EASE.holdSeconds;
let orbitMoveElapsed = 0;
let orbitFrom = 0;
let orbitTo = -Math.PI;
const orbitDirection = -1;

function getSource(imageId) {
  return IMAGE_SOURCES[imageId] ?? userSources.get(imageId) ?? null;
}

function hasSource(imageId) {
  return Boolean(imageId && getSource(imageId));
}

function rememberActiveImage(imageId) {
  if (LOCKED_IMAGE) return;
  try {
    window.localStorage.setItem(ACTIVE_IMAGE_KEY, imageId);
  } catch {
    // Private mode or a full quota should not block the viewer.
  }
}

function readRememberedImage() {
  try {
    return window.localStorage.getItem(ACTIVE_IMAGE_KEY);
  } catch {
    return null;
  }
}

function loadSavedSettingsMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savedSettingsFor(imageId) {
  if (!imageId) return null;
  const entry = loadSavedSettingsMap()[imageId];
  return entry && typeof entry === "object" ? entry : null;
}

function persistSettingsMap(map) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(map));
  } catch {
    // Private mode or a full quota should not block the viewer.
  }
}

function persistActiveSettings() {
  if (!activeImageId || LOCKED_IMAGE) return;
  persistSettingsMap({
    ...loadSavedSettingsMap(),
    [activeImageId]: readCurrentSettings(),
  });
}

function clearSavedSettings(imageId) {
  if (!imageId) return;
  const map = loadSavedSettingsMap();
  if (!(imageId in map)) return;
  delete map[imageId];
  persistSettingsMap(map);
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openUploadsDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = window.indexedDB.open(UPLOAD_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE)) {
        db.createObjectStore(UPLOAD_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listUploadedImages() {
  const db = await openUploadsDb();
  try {
    return (await idbRequest(db.transaction(UPLOAD_STORE, "readonly").objectStore(UPLOAD_STORE).getAll())) ?? [];
  } finally {
    db.close();
  }
}

async function putUploadedImage(record) {
  const db = await openUploadsDb();
  try {
    await idbRequest(db.transaction(UPLOAD_STORE, "readwrite").objectStore(UPLOAD_STORE).put(record));
  } finally {
    db.close();
  }
}

async function deleteUploadedImage(imageId) {
  const db = await openUploadsDb();
  try {
    await idbRequest(db.transaction(UPLOAD_STORE, "readwrite").objectStore(UPLOAD_STORE).delete(imageId));
  } finally {
    db.close();
  }
}

async function getUploadedImage(imageId) {
  const db = await openUploadsDb();
  try {
    return await idbRequest(db.transaction(UPLOAD_STORE, "readonly").objectStore(UPLOAD_STORE).get(imageId));
  } finally {
    db.close();
  }
}

function pickSourceDefaults(source) {
  return {
    cellSize: source.cellSize,
    depth: source.depth,
    dotScale: source.dotScale,
    dotColor: source.dotColor,
    background: source.background,
    refineDetail: source.refineDetail,
    refineLuma: source.refineLuma,
    refineContrast: source.refineContrast,
    refineScale: source.refineScale,
    skipLuma: source.skipLuma,
    skipChroma: source.skipChroma,
    sizeFloor: source.sizeFloor,
    toneGamma: source.toneGamma,
    depthScale: source.depthScale,
    stretchTone: source.stretchTone,
    invert: source.invert,
    minNeighbors: source.minNeighbors,
    minInk: source.minInk,
    keepAll: source.keepAll,
    softCurve: source.softCurve,
    frontCull: source.frontCull,
    backCull: source.backCull,
  };
}

async function persistUploadDefaults(source) {
  try {
    const record = await getUploadedImage(source.id);
    if (!record) return;
    record.defaults = pickSourceDefaults(source);
    await putUploadedImage(record);
  } catch (error) {
    console.warn("Could not persist image defaults", error);
  }
}

function registerUserSource(record) {
  const existing = userSources.get(record.id);
  if (existing?.path.startsWith("blob:")) URL.revokeObjectURL(existing.path);
  if (existing?.thumbPath?.startsWith("blob:")) URL.revokeObjectURL(existing.thumbPath);
  const defaults = record.defaults && typeof record.defaults === "object" ? record.defaults : {};
  userSources.set(record.id, {
    id: record.id,
    label: record.name,
    path: URL.createObjectURL(record.blob),
    thumbPath: record.thumbBlob ? URL.createObjectURL(record.thumbBlob) : null,
    uploaded: true,
    refineDetail: defaults.refineDetail !== false,
    ...defaults,
    hasDefaults: Boolean(record.defaults),
  });
}

function renderImageLibrary() {
  if (!imageOptions && !compactImageOptions) return;

  const addItem = (container, source, removable) => {
    const row = document.createElement("div");
    row.className = removable
      ? "light-controls__library-row"
      : "light-controls__library-row light-controls__library-row--solo";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "light-controls__library-item";
    button.dataset.image = source.id;
    button.setAttribute("aria-label", source.label);
    button.title = source.label;
    button.setAttribute("aria-pressed", String(source.id === activeImageId));

    const thumb = document.createElement("img");
    thumb.className = "light-controls__library-thumb";
    thumb.alt = "";
    thumb.draggable = false;
    thumb.addEventListener("error", () => {
      thumb.classList.add("is-missing");
      thumb.removeAttribute("src");
    });

    const name = document.createElement("span");
    name.className = "light-controls__library-name";
    name.textContent = source.label;

    button.append(thumb, name);
    row.append(button);
    resolveThumbnailUrl(source)
      .then((url) => {
        if (!url) {
          thumb.classList.add("is-missing");
          return;
        }
        thumb.src = url;
        thumb.classList.remove("is-missing");
      })
      .catch(() => {
        thumb.classList.add("is-missing");
      });

    if (removable) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "light-controls__library-remove";
      remove.dataset.removeImage = source.id;
      remove.setAttribute("aria-label", `Remove ${source.label}`);
      remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" /></svg>';
      row.append(remove);
    }

    container.append(row);
  };

  const renderInto = (container, compact = false) => {
    if (!container) return;
    container.replaceChildren();
    Object.values(IMAGE_SOURCES).forEach((source) => {
      if (source.id === "face" && LOCKED_IMAGE !== "face") return;
      addItem(container, source, false);
    });
    userSources.forEach((source) => {
      if (
        LOCKED_IMAGE === "face" &&
        (source.id === FACE_UPLOAD_ID || source.label === FACE_UPLOAD_NAME)
      ) {
        return;
      }
      if (source.label.startsWith("4279de48-6667-4b6a-96cc-73b106c46562")) return;
      addItem(container, source, !compact);
    });
  };

  renderInto(imageOptions);
  renderInto(compactImageOptions, true);
}

async function blobFromFile(file) {
  const bitmap = await createImageBitmap(file);
  const maxEdge = Math.max(bitmap.width, bitmap.height);
  if (maxEdge <= MAX_UPLOAD_EDGE && file.size <= 4 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, MAX_UPLOAD_EDGE / maxEdge);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not read image");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not encode image"))),
      type,
      0.92,
    );
  });
  return blob;
}

function displayNameFromFile(file) {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Untitled";
}

function renderThumbnailCanvas(sampled) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create thumbnail canvas");

  context.fillStyle = PAGE_CREAM;
  context.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

  if (!sampled.positions.length) return canvas;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < sampled.positions.length; index += 3) {
    const x = sampled.positions[index];
    const y = sampled.positions[index + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const width = Math.max(maxX - minX, 0.001);
  const height = Math.max(maxY - minY, 0.001);
  const scale = Math.min(
    (THUMBNAIL_SIZE - THUMBNAIL_PADDING * 2) / width,
    (THUMBNAIL_SIZE - THUMBNAIL_PADDING * 2) / height,
  );
  const offsetX = (THUMBNAIL_SIZE - width * scale) * 0.5;
  const offsetY = (THUMBNAIL_SIZE - height * scale) * 0.5;

  context.fillStyle = `#${COLORS.blue.getHexString()}`;
  for (let index = 0, sizeIndex = 0; index < sampled.positions.length; index += 3, sizeIndex += 1) {
    const x = sampled.positions[index];
    const y = sampled.positions[index + 1];
    const radius = Math.max(0.95, sampled.sizes[sizeIndex] * scale * 0.34);
    const px = offsetX + (x - minX) * scale;
    const py = offsetY + (maxY - y) * scale;
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fill();
  }

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode thumbnail"))),
      "image/png",
    );
  });
}

async function createReliefThumbnailBlob(source, image) {
  const defaults = sourceSampleDefaults(source);
  const sampled = sampleImage(image, Math.max(defaults["cell-size"], THUMBNAIL_MIN_CELL), defaults.depth, {
    refineDetail: false,
    refineLuma: defaults["refine-luma"],
    refineContrast: defaults["refine-contrast"],
    invert: defaults.invert === true,
    skipLuma: defaults["skip-luma"],
    skipChroma: defaults["skip-chroma"],
    sampleScale: THUMBNAIL_SAMPLE_SCALE,
    refineScale: defaults["refine-scale"],
    sizeFloor: defaults["size-floor"],
    toneGamma: defaults["tone-gamma"],
    minInk: defaults["min-ink"],
    softCurve: defaults["soft-curve"] === true,
    keepAll: defaults["keep-all"] === true,
    depthScale: defaults["depth-scale"],
    minNeighbors: defaults["min-neighbors"],
    stretchTone: defaults["stretch-tone"],
    frontCull: defaults["front-cull"],
    backCull: defaults["back-cull"],
  });
  const canvas = renderThumbnailCanvas(sampled);
  return canvasToBlob(canvas);
}

async function resolveThumbnailUrl(source) {
  if (!source) return null;

  const cachedUrl = thumbnailUrlCache.get(source.id);
  if (cachedUrl) return cachedUrl;

  let pending = thumbnailPromiseCache.get(source.id);
  if (!pending) {
    pending = loadImage(source.path)
      .then((image) => createReliefThumbnailBlob(source, image))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        thumbnailUrlCache.set(source.id, url);
        if (source.uploaded) {
          source.thumbPath = url;
        }
        return url;
      })
      .finally(() => {
        thumbnailPromiseCache.delete(source.id);
      });
    thumbnailPromiseCache.set(source.id, pending);
  }

  return pending;
}

async function handleImageUpload(file) {
  if (!file || !file.type.startsWith("image/")) {
    window.alert("Choose a PNG, JPEG, WebP, or GIF image.");
    return;
  }

  const blob = await blobFromFile(file);
  const tempPath = URL.createObjectURL(blob);
  const tempSource = {
    id: `upload-${crypto.randomUUID()}`,
    label: displayNameFromFile(file),
    path: tempPath,
    uploaded: true,
  };

  let thumbBlob = null;
  let defaults = null;
  try {
    const image = await loadImage(tempPath);
    defaults = analyzeImageDefaults(image);
    Object.assign(tempSource, defaults);
    thumbBlob = await createReliefThumbnailBlob(tempSource, image);
  } finally {
    URL.revokeObjectURL(tempPath);
  }

  const record = {
    id: tempSource.id,
    name: tempSource.label,
    createdAt: Date.now(),
    blob,
    thumbBlob,
    defaults,
  };

  try {
    await putUploadedImage(record);
  } catch (error) {
    console.warn("Could not persist uploaded image", error);
  }

  registerUserSource(record);
  renderImageLibrary();
  loadSource(record.id);
}

async function removeUserSource(imageId) {
  const source = userSources.get(imageId);
  if (!source) return;

  if (source.path.startsWith("blob:")) URL.revokeObjectURL(source.path);
  if (source.thumbPath?.startsWith("blob:")) URL.revokeObjectURL(source.thumbPath);
  userSources.delete(imageId);
  imageCache.delete(imageId);
  clearSavedSettings(imageId);

  try {
    await deleteUploadedImage(imageId);
  } catch (error) {
    console.warn("Could not delete uploaded image", error);
  }

  renderImageLibrary();
  if (activeImageId === imageId) {
    activeImageId = null;
    loadSource("antibody");
    return;
  }
  setActiveImageOption(activeImageId);
}

async function hydrateUploadedImages() {
  try {
    const records = await listUploadedImages();
    records
      .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
      .forEach((record) => {
        if (record?.id && record.blob) registerUserSource(record);
      });
  } catch (error) {
    console.warn("Could not restore uploaded images", error);
  }
  renderImageLibrary();
}

function controlValue(name) {
  const input = reliefControls?.querySelector(`[name="${name}"]`);
  return Number(input?.value ?? RELIEF_DEFAULTS[name]);
}

function controlChecked(name, fallback = false) {
  const input = reliefControls?.querySelector(`[name="${name}"]`);
  return input ? input.checked : fallback;
}

function sourceSampleDefaults(source) {
  const invert = source?.invert === true;
  return {
    "cell-size": source?.cellSize ?? RELIEF_DEFAULTS["cell-size"],
    depth: source?.depth ?? RELIEF_DEFAULTS.depth,
    "dot-scale": source?.dotScale ?? RELIEF_DEFAULTS["dot-scale"],
    "refine-luma": source?.refineLuma ?? 0.4,
    "refine-contrast": source?.refineContrast ?? RELIEF_DEFAULTS["refine-contrast"],
    "refine-scale": source?.refineScale ?? RELIEF_DEFAULTS["refine-scale"],
    "skip-luma": source?.skipLuma ?? (invert ? 0.06 : 0.97),
    "skip-chroma": source?.skipChroma ?? (invert ? 0.05 : RELIEF_DEFAULTS["skip-chroma"]),
    "size-floor": source?.sizeFloor ?? 0.34,
    "tone-gamma": source?.toneGamma ?? 1.08,
    "depth-scale": source?.depthScale ?? 1,
    "stretch-tone": source?.stretchTone !== false,
    "refine-detail": source?.refineDetail === true,
    invert,
    "min-neighbors": source?.minNeighbors ?? 0,
    "min-ink": source?.minInk ?? RELIEF_DEFAULTS["min-ink"],
    "keep-all": source?.keepAll === true,
    "fill-paper": source?.fillPaper === true,
    "soft-curve": source?.softCurve === true,
    "front-cull": source?.frontCull ?? RELIEF_DEFAULTS["front-cull"],
    "back-cull": source?.backCull ?? RELIEF_DEFAULTS["back-cull"],
    orbit: source?.orbit === true,
    "show-metrics": RELIEF_DEFAULTS["show-metrics"],
    "dot-color": source?.dotColor ?? RELIEF_DEFAULTS["dot-color"],
    background: source?.background ?? RELIEF_DEFAULTS.background,
    "export-duration": VIDEO_EXPORT.duration,
    "export-fps": VIDEO_EXPORT.fps,
    "export-format": VIDEO_EXPORT.format,
    "export-size": "square",
    "snap-blue": true,
  };
}

function settingsForImage(source) {
  const defaults = sourceSampleDefaults(source);
  if (LOCKED_IMAGE) {
    const locked = sourceSampleDefaults(getSource(LOCKED_IMAGE) ?? source);
    if (!source || source.id === LOCKED_IMAGE) {
      return {
        ...locked,
        orbit: false,
      };
    }
    return {
      ...defaults,
      orbit: false,
    };
  }
  return {
    ...defaults,
    ...savedSettingsFor(source?.id),
    orbit: source?.orbit === true,
  };
}

function bindFaceSourceFromUploads() {
  const face = IMAGE_SOURCES.face;
  if (!face) return;
  const upload =
    userSources.get(FACE_UPLOAD_ID) ??
    [...userSources.values()].find((source) => source.label === FACE_UPLOAD_NAME);
  if (!upload) return;
  face.path = upload.path;
  face.thumbPath = upload.thumbPath;
}

function readCurrentSettings() {
  const settings = {};
  reliefControls?.querySelectorAll("input[name]").forEach((input) => {
    if (input.type === "checkbox") {
      settings[input.name] = input.checked;
      return;
    }
    if (input.type === "radio") {
      if (input.checked) settings[input.name] = input.value;
      return;
    }
    if (input.type === "color") {
      settings[input.name] = input.value;
      return;
    }
    settings[input.name] = Number(input.value);
  });
  return settings;
}

function controlText(name, fallback = "") {
  const checked = reliefControls?.querySelector(`[name="${name}"]:checked`);
  if (checked) return checked.value;
  const input = reliefControls?.querySelector(`[name="${name}"]`);
  return input?.value ?? fallback;
}

function controlHex(name, fallback) {
  const value = reliefControls?.querySelector(`[name="${name}"]`)?.value;
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value : fallback;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function applyDotColor() {
  const hex = controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]);
  pointMaterial.uniforms.uColor.value = new THREE.Color(hex).convertLinearToSRGB();
}

function applyBackground() {
  const hex = controlHex("background", RELIEF_DEFAULTS.background);
  document.querySelector(".shell")?.style.setProperty("background", hex);
}

function applyMetricsVisibility() {
  if (performancePanel) {
    performancePanel.hidden = !controlChecked("show-metrics", false);
  }
}

function normalizeHex(hex) {
  return (hex ?? "").trim().toLowerCase();
}

function syncColorPresets() {
  const ink = normalizeHex(controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]));
  const fill = normalizeHex(controlHex("background", RELIEF_DEFAULTS.background));
  reliefControls?.querySelectorAll(".light-controls__preset").forEach((button) => {
    const selected =
      normalizeHex(button.dataset.ink) === ink && normalizeHex(button.dataset.fill) === fill;
    button.setAttribute("aria-selected", String(selected));
  });
}

function applyPair(ink, fill) {
  const dotInput = reliefControls?.querySelector('[name="dot-color"]');
  const backgroundInput = reliefControls?.querySelector('[name="background"]');
  if (dotInput) dotInput.value = ink;
  if (backgroundInput) backgroundInput.value = fill;
  applyDotColor();
  applyBackground();
  applyMetricsVisibility();
  syncColorPresets();
  persistActiveSettings();
}

function swapDotAndBackground() {
  const ink = controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]);
  const fill = controlHex("background", RELIEF_DEFAULTS.background);
  applyPair(fill, ink);
}

function syncRefineControls() {
  const enabled = controlChecked("refine-detail", true);
  ["refine-luma", "refine-contrast", "refine-scale"].forEach((name) => {
    const input = reliefControls?.querySelector(`[name="${name}"]`);
    const label = input?.closest("label");
    if (input) input.disabled = !enabled;
    label?.classList.toggle("is-disabled", !enabled);
  });
}

function applyReliefSettings(settings) {
  Object.entries(settings).forEach(([name, value]) => {
    const inputs = reliefControls?.querySelectorAll(`[name="${name}"]`);
    if (!inputs?.length) return;
    inputs.forEach((input) => {
      if (input.type === "checkbox") {
        input.checked = Boolean(value);
        return;
      }
      if (input.type === "radio") {
        input.checked = input.value === String(value);
        return;
      }
      input.value = String(value);
    });
  });
  syncDepthRange();
  applyDotColor();
  applyBackground();
  syncColorPresets();
  syncRefineControls();
  updateControlLabels();
}

function updateControlLabels() {
  reliefControls?.querySelectorAll("[data-relief-value]").forEach((output) => {
    const name = output.dataset.reliefValue;
    const value = controlValue(name);
    if (name === "cell-size") {
      output.value = `${Math.round(value)} px`;
      return;
    }
    if (name === "min-neighbors" || name === "export-fps") {
      output.value = String(Math.round(value));
      return;
    }
    if (name === "export-duration") {
      output.value = `${Math.round(value)} s`;
      return;
    }
    if (name === "skip-chroma" || name === "min-ink") {
      output.value = value.toFixed(3);
      return;
    }
    if (
      name === "skip-luma" ||
      name === "refine-luma" ||
      name === "refine-contrast" ||
      name === "refine-scale" ||
      name === "size-floor" ||
      name === "tone-gamma" ||
      name === "front-cull" ||
      name === "back-cull"
    ) {
      output.value = value.toFixed(2);
      return;
    }
    output.value = value.toFixed(1);
  });
  syncExportFormatUi();
}

function syncDepthRange(changedName) {
  const frontInput = reliefControls?.querySelector('[name="front-cull"]');
  const backInput = reliefControls?.querySelector('[name="back-cull"]');
  if (!frontInput || !backInput) return;

  const step = 0.01;
  let front = Number(frontInput.value);
  let back = Number(backInput.value);
  if (front > back - step) {
    if (changedName === "back-cull") back = Math.min(1, front + step);
    else front = Math.max(0, back - step);
  }

  frontInput.value = front.toFixed(2);
  backInput.value = back.toFixed(2);
  frontInput.max = Math.max(0, back - step).toFixed(2);
  backInput.min = Math.min(1, front + step).toFixed(2);
}

function syncExportFormatUi() {
  const still = selectedExportFormat().still === true;
  if (reliefControls) reliefControls.dataset.exportKind = still ? "still" : "video";
  if (exportLabel) exportLabel.textContent = still ? "Export PNG" : "Export video";
  exportVideoButton?.setAttribute(
    "title",
    still
      ? "Still of the current view"
      : "Loop at the current view size",
  );
}

function percentile(values, amount) {
  if (values.length === 0) return 0;
  const index = (values.length - 1) * amount;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return values[low] + (values[high] - values[low]) * (index - low);
}

function snapRange(value, min, max, step) {
  const snapped = Math.round((value - min) / step) * step + min;
  return THREE.MathUtils.clamp(Number(snapped.toFixed(4)), min, max);
}

function analyzeImageDefaults(image) {
  const maxEdge = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const scale = Math.min(1, 160 / maxEdge);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { refineDetail: true };
  }

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const lumas = [];
  const cornerLumas = [];
  let opaque = 0;
  let transparent = 0;
  let light = 0;
  let dark = 0;
  let mid = 0;
  let chromaSum = 0;
  const inset = Math.max(2, Math.round(Math.min(width, height) * 0.12));

  const inCorner = (x, y) =>
    (x < inset && y < inset) ||
    (x >= width - inset && y < inset) ||
    (x < inset && y >= height - inset) ||
    (x >= width - inset && y >= height - inset);

  for (let y = 0, index = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1, index += 4) {
      const alpha = pixels[index + 3] / 255;
      if (alpha < 0.08) {
        transparent += 1;
        continue;
      }

      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      lumas.push(luma);
      chromaSum += chroma;
      opaque += 1;
      if (luma > 0.9) light += 1;
      else if (luma < 0.1) dark += 1;
      else mid += 1;
      if (inCorner(x, y)) cornerLumas.push(luma);
    }
  }

  lumas.sort((left, right) => left - right);
  cornerLumas.sort((left, right) => left - right);

  const median = percentile(lumas, 0.5);
  const p05 = percentile(lumas, 0.05);
  const p10 = percentile(lumas, 0.1);
  const p90 = percentile(lumas, 0.9);
  const p95 = percentile(lumas, 0.95);
  const lightFrac = opaque ? light / opaque : 0;
  const darkFrac = opaque ? dark / opaque : 0;
  const midFrac = opaque ? mid / opaque : 0;
  const meanChroma = opaque ? chromaSum / opaque : 0;
  const cornerMedian = cornerLumas.length ? percentile(cornerLumas, 0.5) : median;
  const hasAlphaBg = transparent / Math.max(transparent + opaque, 1) > 0.18;
  const invert = !hasAlphaBg && (
    (darkFrac > 0.28 && darkFrac > lightFrac * 1.25 && cornerMedian < 0.35) ||
    (cornerMedian < 0.4 && median < 0.45 && lightFrac < 0.2)
  );
  const isDiagram =
    hasAlphaBg ||
    ((lightFrac + darkFrac > 0.55 || p95 - p05 > 0.7) && midFrac < 0.38 && meanChroma < 0.14);
  const isPhoto = !isDiagram && (midFrac > 0.42 || meanChroma > 0.1);

  let cellSize = 5;
  if (isPhoto && maxEdge >= 1600) cellSize = 3;
  else if (isPhoto || (isDiagram && maxEdge >= 1400)) cellSize = 4;

  return {
    cellSize,
    depth: snapRange(isPhoto ? (p95 - p05 > 0.55 ? 2.1 : 1.8) : 1.6, 0, 3.2, 0.05),
    dotScale: 1,
    refineDetail: true,
    refineLuma: invert ? 0.22 : 0.38,
    skipLuma: invert
      ? snapRange(p10 + 0.02, 0, 1, 0.005)
      : snapRange(isPhoto ? p90 - 0.02 : Math.max(0.94, p90), 0, 1, 0.005),
    sizeFloor: snapRange(isDiagram ? 0.28 : isPhoto ? 0.18 : 0.34, 0.05, 0.8, 0.01),
    toneGamma: snapRange(invert ? 0.74 : isPhoto ? 0.9 : 1.02, 0.3, 2, 0.02),
    depthScale: snapRange(isPhoto ? 0.85 : 1, 0.2, 2, 0.05),
    stretchTone: true,
    invert,
    minNeighbors: isDiagram || invert ? 3 : isPhoto ? 1 : 0,
    refineContrast: 0.11,
    refineScale: invert ? 0.55 : isPhoto ? 0.3 : 0.22,
    skipChroma: isPhoto ? 0.03 : invert ? 0.05 : 0.03,
    minInk: invert ? 0.02 : isPhoto ? 0.01 : 0.006,
    keepAll: isPhoto,
    softCurve: isPhoto || invert,
  };
}

function readPixel(pixels, width, height, x, y, invert = false) {
  const column = THREE.MathUtils.clamp(Math.floor(x), 0, width - 1);
  const row = THREE.MathUtils.clamp(Math.floor(y), 0, height - 1);
  const index = (row * width + column) * 4;
  const red = pixels[index] / 255;
  const green = pixels[index + 1] / 255;
  const blue = pixels[index + 2] / 255;
  const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const peak = Math.max(red, green, blue);
  const value = THREE.MathUtils.clamp(luma * 0.45 + peak * 0.55, 0, 1);
  return {
    column,
    row,
    alpha: pixels[index + 3] / 255,
    luma,
    chroma: peak - Math.min(red, green, blue),
    dark: invert ? value : 1 - value,
  };
}

function hashUnit(i, j, salt) {
  const value = Math.sin((i + 0.71) * 12.9898 + (j + 0.13) * 78.233 + salt) * 43758.5453;
  return value - Math.floor(value);
}

function sampleJitter(i, j, cell, sizeRatio) {
  const amount = cell * THREE.MathUtils.lerp(
    0.4,
    0.05,
    Math.pow(THREE.MathUtils.clamp(sizeRatio, 0, 1), 0.7),
  );
  return {
    x: (hashUnit(i, j, 0) * 2 - 1) * amount,
    y: (hashUnit(i, j, 19.17) * 2 - 1) * amount,
  };
}

function isBackgroundPixel(pixel, invert, skipLuma, skipChroma) {
  if (pixel.alpha < 0.08) return true;
  return invert
    ? pixel.luma < skipLuma && pixel.chroma < skipChroma
    : pixel.luma > skipLuma && pixel.chroma < skipChroma;
}

function subjectNeighborCount(pixels, width, height, x, y, invert, skipLuma, skipChroma) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const neighbor = readPixel(pixels, width, height, x + dx, y + dy, invert);
      if (!isBackgroundPixel(neighbor, invert, skipLuma, skipChroma)) count += 1;
    }
  }
  return count;
}

function localContrast(pixels, width, height, x, y, radius) {
  const center = readPixel(pixels, width, height, x, y).luma;
  const offsets = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  return offsets.reduce((range, [dx, dy]) => {
    const neighbor = readPixel(pixels, width, height, x + dx * radius, y + dy * radius).luma;
    return Math.max(range, Math.abs(center - neighbor));
  }, 0);
}

function sampleAmHalftone(image, cellSize, {
  invert = false,
  skipLuma = invert ? 0.06 : 0.97,
  skipChroma = invert ? 0.05 : 0.03,
  toneGamma = 1.08,
  minInk = 0.006,
  sizeFloor = 0.18,
  softCurve = false,
  keepAll = false,
  stretchTone = true,
  fillPaper = false,
} = {}) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const aspect = width / height;
  const worldWidth = WORLD_HEIGHT * aspect;
  const sourceStep = Math.max(1, cellSize * (height / 1024));
  const worldCell = WORLD_HEIGHT * (sourceStep / height);
  const angle = Math.PI / 4;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => {
    const dx = x - centerX;
    const dy = y - centerY;
    return [dx * cosine + dy * sine, -dx * sine + dy * cosine];
  });
  const uMin = Math.min(...corners.map((corner) => corner[0]));
  const uMax = Math.max(...corners.map((corner) => corner[0]));
  const vMin = Math.min(...corners.map((corner) => corner[1]));
  const vMax = Math.max(...corners.map((corner) => corner[1]));
  const u0 = uMin + sourceStep * 0.5;
  const v0 = vMin + sourceStep * 0.5;
  const uCount = Math.max(0, Math.floor((uMax - u0) / sourceStep) + 1);
  const vCount = Math.max(0, Math.floor((vMax - v0) / sourceStep) + 1);
  const samples = [];

  for (let v = v0, j = 0; v <= vMax; v += sourceStep, j += 1) {
    for (let u = u0, i = 0; u <= uMax; u += sourceStep, i += 1) {
      const x = centerX + u * cosine - v * sine;
      const y = centerY + u * sine + v * cosine;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const pixel = readPixel(pixels, width, height, x, y, invert);
      if (pixel.alpha < 0.08) continue;
      const paper = isBackgroundPixel(pixel, invert, skipLuma, skipChroma);
      if (paper && !fillPaper) continue;
      samples.push({ x, y, dark: pixel.dark, paper, i, j });
    }
  }

  const ranked = samples.map((sample) => sample.dark).sort((left, right) => left - right);
  const lift = percentile(ranked, 0.04);
  const shadow = Math.max(lift + 0.04, percentile(ranked, 0.96));
  const positions = [];
  const sizes = [];
  const marks = new Uint8Array(uCount * vCount);

  samples.forEach((sample) => {
    const stretched = stretchTone
      ? THREE.MathUtils.clamp((sample.dark - lift) / (shadow - lift), 0, 1)
      : THREE.MathUtils.clamp(sample.dark, 0, 1);
    const shaped = softCurve ? stretched : THREE.MathUtils.smootherstep(stretched, 0.02, 0.96);
    const ink = keepAll || fillPaper
      ? Math.max(minInk, Math.pow(shaped, toneGamma))
      : Math.pow(shaped, toneGamma);
    if (!keepAll && !fillPaper && ink < minInk) return;

    const floor = sample.paper ? Math.min(sizeFloor, 0.08) : sizeFloor;
    const markSize = Math.max(worldCell * floor, worldCell * 2 * Math.sqrt(ink / Math.PI));
    const jitter = sampleJitter(
      sample.i ?? 0,
      sample.j ?? 0,
      worldCell,
      THREE.MathUtils.clamp(markSize / worldCell, 0, 1),
    );
    positions.push(
      (sample.x / width - 0.5) * worldWidth + jitter.x,
      (0.5 - sample.y / height) * WORLD_HEIGHT + jitter.y,
      0,
    );
    sizes.push(markSize);
    if (!sample.paper && sample.i >= 0 && sample.i < uCount && sample.j >= 0 && sample.j < vCount) {
      marks[sample.j * uCount + sample.i] = 1;
    }
  });

  const x0 = centerX + u0 * cosine - v0 * sine;
  const y0 = centerY + u0 * sine + v0 * cosine;

  return {
    positions,
    sizes,
    columns: Math.ceil((uMax - uMin) / sourceStep),
    rows: Math.ceil((vMax - vMin) / sourceStep),
    grid: {
      originX: (x0 / width - 0.5) * worldWidth,
      originY: (0.5 - y0 / height) * WORLD_HEIGHT,
      duX: worldCell * cosine,
      duY: -worldCell * sine,
      dvX: -worldCell * sine,
      dvY: -worldCell * cosine,
      uCount,
      vCount,
      worldCell,
      subject: marks,
    },
  };
}

function sampleImage(image, cellSize, depth, {
  refineDetail = false,
  refineLuma = 0.4,
  refineContrast = 0.1,
  invert = false,
  skipLuma = invert ? 0.06 : 0.97,
  skipChroma = invert ? 0.05 : 0.03,
  sampleScale = 1,
  refineScale = 0.22,
  sizeFloor = 0.34,
  toneGamma = 1.08,
  minInk = 0.006,
  softCurve = false,
  keepAll = false,
  fillPaper = false,
  flatHalftone = false,
  depthScale = 1,
  minNeighbors = 0,
  stretchTone = true,
  frontCull = 0,
  backCull = 0.9,
} = {}) {
  if (flatHalftone) {
    return sampleAmHalftone(image, cellSize, {
      invert,
      skipLuma,
      skipChroma,
      toneGamma,
      minInk,
      sizeFloor,
      softCurve,
      keepAll,
      stretchTone,
      fillPaper,
    });
  }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const aspect = width / height;
  const worldWidth = WORLD_HEIGHT * aspect;
  const sourceStep = Math.max(1, cellSize * (height / 1024) * sampleScale);
  const fineStep = refineDetail ? sourceStep / 4 : sourceStep;
  const worldCell = WORLD_HEIGHT * (sourceStep / height);
  const samples = [];
  const columns = Math.ceil(width / fineStep);
  const rows = Math.ceil(height / fineStep);
  const subject = new Uint8Array(columns * rows);

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const x = (columnIndex + 0.5) * fineStep;
      const y = (rowIndex + 0.5) * fineStep;
      const pixel = readPixel(pixels, width, height, x, y, invert);
      if (pixel.alpha < 0.08) continue;
      const paper = isBackgroundPixel(pixel, invert, skipLuma, skipChroma);
      if (!paper) subject[rowIndex * columns + columnIndex] = 1;
      if (!fillPaper && paper) continue;
      if (
        !fillPaper &&
        minNeighbors > 0 &&
        subjectNeighborCount(pixels, width, height, x, y, invert, skipLuma, skipChroma) < minNeighbors
      ) {
        continue;
      }

      let cellScale = 1;
      if (refineDetail) {
        const onCoarse = columnIndex % 4 === 1 && rowIndex % 4 === 1;
        const contrast = localContrast(pixels, width, height, x, y, Math.max(2, fineStep * 1.5));
        const feature = invert
          ? pixel.luma > refineLuma && contrast > refineContrast
          : pixel.luma < refineLuma && contrast > refineContrast;
        if (!onCoarse && !feature) continue;
        if (feature) cellScale = refineScale;
      }

      samples.push({
        x,
        y,
        dark: pixel.dark,
        cellScale,
        column: columnIndex,
        row: rowIndex,
      });
    }
  }

  const ranked = samples.map((sample) => sample.dark).sort((a, b) => a - b);
  const lift = percentile(ranked, 0.04);
  const shadow = Math.max(lift + 0.04, percentile(ranked, 0.96));
  const positions = [];
  const sizes = [];

  samples.forEach((sample) => {
    const stretched = stretchTone
      ? THREE.MathUtils.clamp((sample.dark - lift) / (shadow - lift), 0, 1)
      : THREE.MathUtils.clamp(sample.dark, 0, 1);
    const shaped = softCurve ? stretched : THREE.MathUtils.smootherstep(stretched, 0.02, 0.96);
    const ink = keepAll
      ? Math.max(minInk, Math.pow(shaped, toneGamma))
      : Math.pow(shaped, toneGamma);
    if (!keepAll && ink < minInk) return;

    const sampleCell = worldCell * sample.cellScale;
    const sizeInk = !invert && sample.cellScale < 1 ? Math.min(ink, 0.58) : ink;
    const markSize = Math.max(sampleCell * sizeFloor, sizeInk * sampleCell * 0.9);
    const sizeRatio = THREE.MathUtils.clamp(markSize / worldCell, 0, 1);
    const depthFactor = Math.pow(1 - sizeRatio, 0.85);
    if (depthFactor < frontCull || depthFactor > backCull) return;

    const jitter = sampleJitter(
      sample.column ?? 0,
      sample.row ?? 0,
      sampleCell,
      sizeRatio,
    );
    positions.push(
      (sample.x / width - 0.5) * worldWidth + jitter.x,
      (0.5 - sample.y / height) * WORLD_HEIGHT + jitter.y,
      -depthFactor * depth * depthScale,
    );
    sizes.push(markSize);
  });

  return {
    positions,
    sizes,
    columns: Math.ceil(width / sourceStep),
    rows: Math.ceil(height / sourceStep),
    grid: {
      originX: ((0.5 * fineStep) / width - 0.5) * worldWidth,
      originY: (0.5 - (0.5 * fineStep) / height) * WORLD_HEIGHT,
      duX: (fineStep / width) * worldWidth,
      duY: 0,
      dvX: 0,
      dvY: -(fineStep / height) * WORLD_HEIGHT,
      uCount: columns,
      vCount: rows,
      worldCell: WORLD_HEIGHT * (fineStep / height),
      subject,
    },
  };
}

function reliefCenterZ(positions) {
  if (!positions?.length) {
    return -0.5 * controlValue("depth") * controlValue("depth-scale");
  }
  let min = Infinity;
  let max = -Infinity;
  for (let index = 2; index < positions.length; index += 3) {
    const z = positions[index];
    if (z < min) min = z;
    if (z > max) max = z;
  }
  return (min + max) * 0.5;
}

function updateOrbitTarget(positions) {
  controls.target.set(0, 0, reliefCenterZ(positions));
}

function disposePoints() {
  if (!points) return;
  field.remove(points);
  points.geometry.dispose();
  points = null;
}

function responsiveCellSize(baseCellSize) {
  const shortestEdge = Math.min(sceneElement?.clientWidth ?? 0, sceneElement?.clientHeight ?? 0);
  if (!shortestEdge || shortestEdge >= 1080) return baseCellSize;
  const amount = 1 - THREE.MathUtils.clamp((shortestEdge - 440) / 640, 0, 1);
  return baseCellSize * THREE.MathUtils.lerp(1, 3, amount);
}

function rebuildField() {
  if (!sourceImage) return;

  const cellSize = responsiveCellSize(controlValue("cell-size"));
  const depth = controlValue("depth");
  const source = getSource(activeImageId);
  const sampled = sampleImage(sourceImage, cellSize, depth, {
    refineDetail: controlChecked("refine-detail", source?.refineDetail === true),
    refineLuma: controlValue("refine-luma"),
    refineContrast: controlValue("refine-contrast"),
    invert: controlChecked("invert", source?.invert === true),
    skipLuma: controlValue("skip-luma"),
    skipChroma: controlValue("skip-chroma"),
    sampleScale: source?.sampleScale,
    refineScale: controlValue("refine-scale"),
    sizeFloor: controlValue("size-floor"),
    toneGamma: controlValue("tone-gamma"),
    minInk: controlValue("min-ink"),
    softCurve: controlChecked("soft-curve", source?.softCurve === true),
    keepAll: controlChecked("keep-all", source?.keepAll === true),
    fillPaper: controlChecked("fill-paper", source?.fillPaper === true),
    depthScale: controlValue("depth-scale"),
    minNeighbors: controlValue("min-neighbors"),
    stretchTone: controlChecked("stretch-tone", true),
    frontCull: controlValue("front-cull"),
    backCull: controlValue("back-cull"),
    flatHalftone: source?.flatHalftone === true,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(sampled.positions, 3));
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sampled.sizes, 1));

  disposePoints();
  points = new THREE.Points(geometry, pointMaterial);
  field.add(points);
  updateOrbitTarget(sampled.positions);

  pointCount = sampled.positions.length / 3;
  gridLabel = `${sampled.columns} × ${sampled.rows}`;
  fieldGrid = sampled.grid ?? null;
  pointMaterial.uniforms.uDotScale.value = controlValue("dot-scale");
  updateControlLabels();
}

function setRenderSize(width, height, pixelRatio, updateStyle = true) {
  const aspect = width / Math.max(height, 1);
  const halfH = VIEW_HEIGHT * 0.5;
  camera.left = -halfH * aspect;
  camera.right = halfH * aspect;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, updateStyle);
  pointMaterial.uniforms.uPixelRatio.value = pixelRatio;
  pointMaterial.uniforms.uViewportHeight.value = height / VIEW_HEIGHT;
  pointMaterial.uniforms.uZoom.value = camera.zoom;
  const bufferWidth = Math.max(1, Math.round(width * pixelRatio));
  const bufferHeight = Math.max(1, Math.round(height * pixelRatio));
  sceneTarget.setSize(bufferWidth, bufferHeight);
  overlayMaterial.uniforms.uResolution.value.set(bufferWidth, bufferHeight);
  overlayMaterial.uniforms.uGlyphCellSize.value.set(8 * pixelRatio, 13 * pixelRatio);
}

let reliefPanelAnimating = false;

function updateSize() {
  if (isExportingVideo) return;
  setRenderSize(
    sceneElement.clientWidth,
    sceneElement.clientHeight,
    Math.min(window.devicePixelRatio, 2),
  );
  if (sourceImage && !reliefPanelAnimating) rebuildField();
}

function updateMetrics(delta) {
  fpsFrameCount += 1;
  fpsElapsed += delta;
  if (fpsElapsed >= 0.45) {
    displayedFps = Math.round(fpsFrameCount / fpsElapsed);
    fpsFrameCount = 0;
    fpsElapsed = 0;
  }

  if (metricPoints) metricPoints.textContent = pointFormatter.format(pointCount);
  if (metricGrid) metricGrid.textContent = gridLabel;
  if (metricRotation) {
    const degrees = Math.round((orbitAzimuth() * 180) / Math.PI);
    if (displayedRotation !== degrees) {
      displayedRotation = degrees;
      metricRotation.textContent = `${degrees}°`;
    }
  }
  if (metricFps) metricFps.textContent = displayedFps ? String(displayedFps) : "—";
}

function orbitAzimuth() {
  return Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
}

function wrapFaceAngle(theta) {
  const tau = Math.PI * 2;
  const normalized = ((theta % tau) + tau) % tau;
  return normalized > Math.PI * 1.5 || normalized < Math.PI * 0.5 ? 0 : Math.PI;
}

function easeInOutSine(amount) {
  return 0.5 - 0.5 * Math.cos(Math.PI * amount);
}

function setOrbitAzimuth(theta) {
  const offsetX = camera.position.x - controls.target.x;
  const offsetZ = camera.position.z - controls.target.z;
  const radius = Math.hypot(offsetX, offsetZ);
  camera.position.x = controls.target.x + Math.sin(theta) * radius;
  camera.position.z = controls.target.z + Math.cos(theta) * radius;
  camera.lookAt(controls.target);
}

function orbitCycleDuration() {
  return ORBIT_EASE.holdSeconds * 2 + ORBIT_EASE.halfTurnSeconds * 2;
}

function orbitAzimuthAt(time) {
  const cycle = orbitCycleDuration();
  const elapsed = ((time % cycle) + cycle) % cycle;
  const hold = ORBIT_EASE.holdSeconds;
  const move = ORBIT_EASE.halfTurnSeconds;
  if (elapsed < hold) return 0;
  if (elapsed < hold + move) {
    return orbitDirection * Math.PI * easeInOutSine((elapsed - hold) / move);
  }
  if (elapsed < hold * 2 + move) return orbitDirection * Math.PI;
  return orbitDirection * Math.PI * (1 + easeInOutSine((elapsed - hold * 2 - move) / move));
}

function syncOrbitFromCamera() {
  const theta = orbitAzimuth();
  const toFront = Math.abs(Math.atan2(Math.sin(theta), Math.cos(theta)));
  const toBack = Math.abs(Math.atan2(Math.sin(theta - Math.PI), Math.cos(theta - Math.PI)));
  if (toFront < 0.12 || toBack < 0.12) {
    orbitFrom = toFront <= toBack ? 0 : Math.PI;
    orbitTo = orbitFrom + orbitDirection * Math.PI;
    orbitMode = "hold";
    orbitHoldRemaining = ORBIT_EASE.holdSeconds;
    setOrbitAzimuth(orbitFrom);
    return;
  }

  orbitFrom = theta;
  orbitTo = orbitFrom + orbitDirection * Math.PI;
  orbitMode = "move";
  orbitMoveElapsed = 0;
}

function updateDrivenOrbit(delta) {
  if (!controlChecked("orbit", orbitEnabled) || userOrbiting || isExportingVideo) return;

  if (orbitMode === "hold") {
    setOrbitAzimuth(orbitFrom);
    orbitHoldRemaining -= delta;
    if (orbitHoldRemaining > 0) return;
    orbitMode = "move";
    orbitMoveElapsed = 0;
    orbitTo = orbitFrom + orbitDirection * Math.PI;
    return;
  }

  orbitMoveElapsed += delta;
  const amount = Math.min(orbitMoveElapsed / ORBIT_EASE.halfTurnSeconds, 1);
  setOrbitAzimuth(orbitFrom + (orbitTo - orbitFrom) * easeInOutSine(amount));
  if (amount < 1) return;

  orbitFrom = wrapFaceAngle(orbitTo);
  orbitTo = orbitFrom + orbitDirection * Math.PI;
  orbitMode = "hold";
  orbitHoldRemaining = ORBIT_EASE.holdSeconds;
  setOrbitAzimuth(orbitFrom);
}

function easedOrbitAngles(frameCount) {
  const cycle = orbitCycleDuration();
  const angles = new Float64Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    angles[frame] = orbitAzimuthAt((frame / frameCount) * cycle);
  }
  return angles;
}

function applyExportCamera(frame, startOffset, orbitAngles, xzRadius) {
  if (orbitAngles) {
    camera.position.set(
      controls.target.x + Math.sin(orbitAngles[frame]) * xzRadius,
      controls.target.y + startOffset.y,
      controls.target.z + Math.cos(orbitAngles[frame]) * xzRadius,
    );
  } else {
    camera.position.copy(controls.target).add(startOffset);
  }
  camera.lookAt(controls.target);
  camera.updateMatrixWorld();
}

function renderView() {
  renderer.render(scene, camera);
  drawLiveRegionOverlay();
}

function gridSubjectCoverage(grid, i, j, strideU = 1, strideV = strideU) {
  if (!grid?.subject) return 1;
  const iMax = Math.min(grid.uCount, i + strideU);
  const jMax = Math.min(grid.vCount, j + strideV);
  let hits = 0;
  let total = 0;
  for (let row = j; row < jMax; row += 1) {
    const offset = row * grid.uCount;
    for (let column = i; column < iMax; column += 1) {
      total += 1;
      if (grid.subject[offset + column]) hits += 1;
    }
  }
  return total ? hits / total : 0;
}

function asciiOverlayTime(time) {
  if (prefersReducedMotion.matches) return 0;
  return Number.isFinite(time) ? time : clock.elapsedTime;
}

function asciiGlyphIndex(coverage, i, j, time = 0) {
  const count = ASCII_GLYPHS.length;
  const phase = hashUnit(i, j, 7.13);
  if (time <= 0) {
    return Math.floor(THREE.MathUtils.clamp(coverage * 5.99 + (phase - 0.5) * 0.35, 0, 5));
  }
  const tick = Math.floor(time * ASCII_GLYPH_RATE + phase * count);
  return ((tick % count) + count) % count;
}

function fillParallelogram(context, origin, axisU, axisV) {
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(origin.x + axisU.x, origin.y + axisU.y);
  context.lineTo(origin.x + axisU.x + axisV.x, origin.y + axisU.y + axisV.y);
  context.lineTo(origin.x + axisV.x, origin.y + axisV.y);
  context.closePath();
  context.fill();
}

function overlayPointInsideBox(point, box) {
  return Math.abs(point.uvX - box.x) <= box.z * 0.5
    && Math.abs(point.uvY - box.y) <= box.w * 0.5;
}

function worldToGridCell(grid, x, y) {
  const px = x - grid.originX;
  const py = y - grid.originY;
  const det = grid.duX * grid.dvY - grid.dvX * grid.duY;
  if (Math.abs(det) < 1e-12) return { i: 0, j: 0 };
  return {
    i: (px * grid.dvY - py * grid.dvX) / det,
    j: (-px * grid.duY + py * grid.duX) / det,
  };
}

function unprojectUvToWorldZ0(uvX, uvY) {
  const ndcX = uvX * 2 - 1;
  const ndcY = uvY * 2 - 1;
  const e = overlayViewProjectionInverse.elements;
  const unproject = (clipZ) => {
    const x = e[0] * ndcX + e[4] * ndcY + e[8] * clipZ + e[12];
    const y = e[1] * ndcX + e[5] * ndcY + e[9] * clipZ + e[13];
    const z = e[2] * ndcX + e[6] * ndcY + e[10] * clipZ + e[14];
    const w = e[3] * ndcX + e[7] * ndcY + e[11] * clipZ + e[15];
    const invW = 1 / w;
    return { x: x * invW, y: y * invW, z: z * invW };
  };
  const near = unproject(-1);
  const far = unproject(1);
  const span = far.z - near.z;
  const t = Math.abs(span) < 1e-6 ? 0 : (0 - near.z) / span;
  return {
    x: near.x + (far.x - near.x) * t,
    y: near.y + (far.y - near.y) * t,
  };
}

function projectWorldToOverlay(x, y, z, width, height) {
  const e = overlayViewProjection.elements;
  const cx = e[0] * x + e[4] * y + e[8] * z + e[12];
  const cy = e[1] * x + e[5] * y + e[9] * z + e[13];
  const cw = e[3] * x + e[7] * y + e[11] * z + e[15];
  const invW = 1 / cw;
  const uvX = cx * invW * 0.5 + 0.5;
  const uvY = cy * invW * 0.5 + 0.5;
  return {
    x: uvX * width,
    y: (1 - uvY) * height,
    uvX,
    uvY,
  };
}

function drawRegionOverlay(context, width, height, { clear = true, time } = {}) {
  if (clear) context.clearRect(0, 0, width, height);
  if (!manualRegions.length) return;

  const ink = controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]);
  const paper = controlHex("background", RELIEF_DEFAULTS.background);
  overlayViewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  overlayViewProjectionInverse.copy(overlayViewProjection).invert();
  context.imageSmoothingEnabled = false;

  const stride = ASCII_SCALE;
  const padU = 1 / (ASCII_GLYPH_COLUMNS + 2);
  const padV = 1 / (ASCII_GLYPH_ROWS + 2);
  const glyphTime = asciiOverlayTime(time);

  manualRegions.forEach((box) => {
    const left = (box.x - box.z * 0.5) * width;
    const top = (1 - box.y - box.w * 0.5) * height;
    const boxWidth = box.z * width;
    const boxHeight = box.w * height;
    context.save();
    context.beginPath();
    context.rect(left, top, boxWidth, boxHeight);
    context.clip();

    if (fieldGrid) {
      const corners = [
        unprojectUvToWorldZ0(box.x - box.z * 0.5, box.y - box.w * 0.5),
        unprojectUvToWorldZ0(box.x + box.z * 0.5, box.y - box.w * 0.5),
        unprojectUvToWorldZ0(box.x - box.z * 0.5, box.y + box.w * 0.5),
        unprojectUvToWorldZ0(box.x + box.z * 0.5, box.y + box.w * 0.5),
      ].map((corner) => worldToGridCell(fieldGrid, corner.x, corner.y));
      const projectCell = (i, j) => {
        const worldX = fieldGrid.originX + i * fieldGrid.duX + j * fieldGrid.dvX;
        const worldY = fieldGrid.originY + i * fieldGrid.duY + j * fieldGrid.dvY;
        return projectWorldToOverlay(worldX, worldY, 0, width, height);
      };

      const sampleU = projectCell(0, 0);
      const sampleU1 = projectCell(1, 0);
      const sampleV = projectCell(0, 1);
      const sampleWidth = Math.hypot(sampleU1.x - sampleU.x, sampleU1.y - sampleU.y);
      const sampleHeight = Math.hypot(sampleV.x - sampleU.x, sampleV.y - sampleU.y);
      const strideU = Math.max(stride, Math.ceil(ASCII_CELL_WIDTH / Math.max(sampleWidth, 0.01)));
      const strideV = Math.max(stride, Math.ceil(ASCII_CELL_HEIGHT / Math.max(sampleHeight, 0.01)));
      const iMin = Math.max(0, Math.floor(Math.min(...corners.map((cell) => cell.i))) - strideU);
      const iMax = Math.min(fieldGrid.uCount - 1, Math.ceil(Math.max(...corners.map((cell) => cell.i))) + strideU);
      const jMin = Math.max(0, Math.floor(Math.min(...corners.map((cell) => cell.j))) - strideV);
      const jMax = Math.min(fieldGrid.vCount - 1, Math.ceil(Math.max(...corners.map((cell) => cell.j))) + strideV);
      const iStart = Math.ceil(iMin / strideU) * strideU;
      const jStart = Math.ceil(jMin / strideV) * strideV;

      for (let j = jStart; j <= jMax; j += strideV) {
        for (let i = iStart; i <= iMax; i += strideU) {
          const coverage = gridSubjectCoverage(fieldGrid, i, j, strideU, strideV);
          if (coverage <= 0) continue;

          const p00 = projectCell(i, j);
          const p10 = projectCell(i + strideU, j);
          const p01 = projectCell(i, j + strideV);
          const center = projectCell(i + strideU * 0.5, j + strideV * 0.5);
          if (!overlayPointInsideBox(center, box)) {
            continue;
          }

          const origin = { x: p00.x, y: p00.y };
          const axisU = { x: p10.x - p00.x, y: p10.y - p00.y };
          const axisV = { x: p01.x - p00.x, y: p01.y - p00.y };
          const area = Math.abs(axisU.x * axisV.y - axisU.y * axisV.x);
          if (area < 0.5) continue;

          context.fillStyle = paper;
          fillParallelogram(context, origin, axisU, axisV);

          const glyph = ASCII_GLYPHS[asciiGlyphIndex(coverage, i, j, glyphTime)];
          const pixelU = {
            x: axisU.x * (1 - padU * 2) / ASCII_GLYPH_COLUMNS,
            y: axisU.y * (1 - padU * 2) / ASCII_GLYPH_COLUMNS,
          };
          const pixelV = {
            x: axisV.x * (1 - padV * 2) / ASCII_GLYPH_ROWS,
            y: axisV.y * (1 - padV * 2) / ASCII_GLYPH_ROWS,
          };
          const glyphOrigin = {
            x: origin.x + axisU.x * padU + axisV.x * padV,
            y: origin.y + axisU.y * padU + axisV.y * padV,
          };
          context.fillStyle = ink;
          const drawU = { x: pixelU.x * 1.12, y: pixelU.y * 1.12 };
          const drawV = { x: pixelV.x * 1.12, y: pixelV.y * 1.12 };
          glyph.forEach((line, row) => {
            for (let column = 0; column < line.length; column += 1) {
              if (line[column] !== "#") continue;
              fillParallelogram(context, {
                x: glyphOrigin.x + pixelU.x * (column - 0.06) + pixelV.x * (row - 0.06),
                y: glyphOrigin.y + pixelU.y * (column - 0.06) + pixelV.y * (row - 0.06),
              }, drawU, drawV);
            }
          });
        }
      }
    }

    context.restore();
    context.strokeStyle = ink;
    context.lineWidth = Math.max(1, width / 700);
    context.strokeRect(left + 0.5, top + 0.5, boxWidth - 1, boxHeight - 1);
  });
}

function drawLiveRegionOverlay() {
  if (!regionOverlayContext || !regionOverlay) return;
  const width = sceneElement.clientWidth;
  const height = sceneElement.clientHeight;
  const pixelRatio = renderer.getPixelRatio();
  const bufferWidth = Math.max(1, Math.round(width * pixelRatio));
  const bufferHeight = Math.max(1, Math.round(height * pixelRatio));
  if (regionOverlay.width !== bufferWidth || regionOverlay.height !== bufferHeight) {
    regionOverlay.width = bufferWidth;
    regionOverlay.height = bufferHeight;
    regionOverlay.style.width = `${width}px`;
    regionOverlay.style.height = `${height}px`;
    regionOverlayContext.imageSmoothingEnabled = false;
  }
  regionOverlayContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  regionOverlayContext.imageSmoothingEnabled = false;
  drawRegionOverlay(regionOverlayContext, width, height, { time: clock.elapsedTime });
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  controls.update();
  updateDrivenOrbit(delta);
  pointMaterial.uniforms.uZoom.value = camera.zoom;
  renderView();
  updateMetrics(delta);
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${path}`));
    image.src = path;
  });
}

function setActiveImageOption(imageId) {
  document.querySelectorAll(".light-controls__library-item[data-image]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.image === imageId));
  });
}

function presentImage(image, imageId) {
  activeImageId = imageId;
  sourceImage = image;
  setActiveImageOption(imageId);
  rememberActiveImage(imageId);
  const source = getSource(imageId);
  if (source?.uploaded && !source.hasDefaults) {
    Object.assign(source, analyzeImageDefaults(image), { hasDefaults: true });
    persistUploadDefaults(source);
  }
  applyReliefSettings(settingsForImage(source));
  rebuildField();
  loadingElement.classList.remove("is-error");
  loadingElement.classList.add("is-hidden");
  renderer.setAnimationLoop(animate);
}

function loadSource(imageId) {
  const source = getSource(imageId);
  if (!source || imageId === activeImageId) return;

  const token = ++loadToken;
  setActiveImageOption(imageId);
  loadingElement.classList.remove("is-hidden", "is-error");

  const cached = imageCache.get(imageId);
  if (cached) {
    presentImage(cached, imageId);
    return;
  }

  loadImage(source.path)
    .then((image) => {
      if (token !== loadToken) return;
      imageCache.set(imageId, image);
      presentImage(image, imageId);
    })
    .catch((error) => {
      if (token !== loadToken) return;
      console.error(error);
      activeImageId = null;
      loadingElement.classList.add("is-error");
      loadingElement.classList.remove("is-hidden");
    });
}

function handleImageLibraryClick(event) {
  const remove = event.target.closest("[data-remove-image]");
  if (remove) {
    event.preventDefault();
    removeUserSource(remove.dataset.removeImage);
    return;
  }

  const button = event.target.closest("[data-image]");
  if (!button) return;
  loadSource(button.dataset.image);
}

imageOptions?.addEventListener("click", handleImageLibraryClick);
compactImageOptions?.addEventListener("click", handleImageLibraryClick);

uploadImageButton?.addEventListener("click", () => {
  uploadImageInput?.click();
});

uploadImageInput?.addEventListener("change", () => {
  const file = uploadImageInput.files?.[0];
  uploadImageInput.value = "";
  if (file) handleImageUpload(file);
});

reliefControls?.addEventListener("input", (event) => {
  const name = event.target?.getAttribute("name") ?? document.activeElement?.getAttribute("name");
  if (name === "refine-detail") syncRefineControls();
  if (name === "front-cull" || name === "back-cull") syncDepthRange(name);
  if (name === "dot-scale") {
    pointMaterial.uniforms.uDotScale.value = controlValue("dot-scale");
    updateControlLabels();
    persistActiveSettings();
    return;
  }
  if (name === "dot-color") {
    applyDotColor();
    syncColorPresets();
    persistActiveSettings();
    return;
  }
  if (name === "background") {
    applyBackground();
    syncColorPresets();
    persistActiveSettings();
    return;
  }
  if (
    name === "orbit" ||
    name === "show-metrics" ||
    name === "export-duration" ||
    name === "export-fps" ||
    name === "export-format" ||
    name === "export-size" ||
    name === "snap-blue"
  ) {
    if (name === "show-metrics") applyMetricsVisibility();
    updateControlLabels();
    persistActiveSettings();
    return;
  }
  rebuildField();
  persistActiveSettings();
});

reliefControls?.querySelector("[data-swap-colors]")?.addEventListener("click", () => {
  swapDotAndBackground();
});

reliefControls?.querySelector(".light-controls__presets")?.addEventListener("click", (event) => {
  const preset = event.target.closest(".light-controls__preset");
  if (!preset?.dataset.ink || !preset.dataset.fill) return;
  applyPair(preset.dataset.ink, preset.dataset.fill);
});

function setSettingsTab(tabId) {
  reliefControls?.querySelectorAll("[data-settings-tab]").forEach((tab) => {
    const selected = tab.dataset.settingsTab === tabId;
    tab.setAttribute("aria-selected", String(selected));
  });
  reliefControls?.querySelectorAll("[data-settings-panel]").forEach((panel) => {
    const active = panel.dataset.settingsPanel === tabId;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
  window.requestAnimationFrame(updateReliefScrollHint);
}

reliefControls?.querySelector("[role='tablist']")?.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-settings-tab]");
  if (!tab) return;
  setSettingsTab(tab.dataset.settingsTab);
});

const RELIEF_PANEL = {
  closedWidth: 0,
  openWidth: 248,
  openMs: 360,
  closeMs: 280,
};
const mobileReliefPanel = window.matchMedia("(max-width: 640px)");

function reliefPanelOpenWidth() {
  return mobileReliefPanel.matches
    ? Math.max(0, document.documentElement.clientWidth - 16)
    : RELIEF_PANEL.openWidth;
}

const reliefToggle = document.querySelector("[data-toggle-relief]");
const reliefStack = reliefControls?.querySelector(".light-controls__stack");
const reliefSheet = reliefControls?.querySelector(".light-controls__sheet");
let reliefPanelAnimation = null;
let reliefSheetAnimation = null;
let reliefPanelGeneration = 0;
let reliefPanelOpen = Boolean(reliefControls?.classList.contains("is-open"));

function activeSettingsPanel() {
  return reliefControls?.querySelector(".light-controls__panel.is-active") ?? null;
}

function updateReliefScrollHint() {
  const panel = activeSettingsPanel();
  if (!reliefControls || !panel || !mobileReliefPanel.matches || !reliefPanelOpen) {
    reliefControls?.classList.remove("has-scroll-overflow", "is-scrolled-end");
    return;
  }
  const hasOverflow = panel.scrollHeight - panel.clientHeight > 2;
  const isAtEnd = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
  reliefControls.classList.toggle("has-scroll-overflow", hasOverflow);
  reliefControls.classList.toggle("is-scrolled-end", !hasOverflow || isAtEnd);
}

reliefSheet?.addEventListener("scroll", updateReliefScrollHint, { passive: true });
reliefControls?.querySelectorAll(".light-controls__panel").forEach((panel) => {
  panel.addEventListener("scroll", updateReliefScrollHint, { passive: true });
});

function settleReliefPanel(open, width, height) {
  reliefControls.classList.toggle("is-revealed", open);
  reliefControls.inert = !open;
  reliefControls.setAttribute("aria-hidden", String(!open));
  reliefControls.style.width = `${width}px`;
  reliefControls.style.height = open ? "auto" : `${height}px`;
  reliefControls.style.transform = "";
  reliefControls.style.willChange = "auto";
  if (reliefSheet) {
    reliefSheet.style.opacity = "";
  }
  if (compactImageOptions) compactImageOptions.hidden = open;
  reliefPanelAnimating = false;
  updateSize();
  window.requestAnimationFrame(updateReliefScrollHint);
}

function lockReliefPanelSize(rect) {
  reliefControls.style.width = `${rect.width}px`;
  reliefControls.style.height = `${rect.height}px`;
}

function finishAnimation(holder) {
  return holder.finished.catch(() => {}).then(() => {
    holder.cancel();
  });
}

function animateReliefShell(from, toWidth, toHeight, open) {
  const fixedMobileWidth = mobileReliefPanel.matches
    ? (open ? toWidth : from.width)
    : null;
  const fromWidth = fixedMobileWidth ?? from.width;
  const animatedWidth = fixedMobileWidth ?? toWidth;
  lockReliefPanelSize({ width: fromWidth, height: from.height });
  reliefControls.style.willChange = "width, height";
  const animation = reliefControls.animate(
    [
      {
        width: `${fromWidth}px`,
        height: `${from.height}px`,
      },
      {
        width: `${animatedWidth}px`,
        height: `${toHeight}px`,
      },
    ],
    {
      duration: open ? RELIEF_PANEL.openMs : RELIEF_PANEL.closeMs,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards",
    },
  );
  reliefPanelAnimation = animation;
  return finishAnimation(animation).then(() => {
    if (reliefPanelAnimation === animation) reliefPanelAnimation = null;
  });
}

function animateReliefSheet(open, fromOpacity) {
  if (!reliefSheet) return Promise.resolve();
  const animation = reliefSheet.animate(
    [
      { opacity: fromOpacity },
      { opacity: open ? 1 : 0 },
    ],
    {
      duration: open ? RELIEF_PANEL.openMs : RELIEF_PANEL.closeMs,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards",
    },
  );
  reliefSheetAnimation = animation;
  return finishAnimation(animation).then(() => {
    if (reliefSheetAnimation === animation) reliefSheetAnimation = null;
  });
}

async function animateReliefPanel(open) {
  if (!reliefControls || !reliefStack) return;
  const generation = ++reliefPanelGeneration;
  const sheetStyle = reliefSheet ? getComputedStyle(reliefSheet) : null;
  const fromOpacity = sheetStyle ? Number(sheetStyle.opacity) : 0;
  reliefPanelAnimating = true;
  reliefPanelAnimation?.cancel();
  reliefSheetAnimation?.cancel();
  reliefToggle?.setAttribute("aria-expanded", String(open));
  reliefToggle?.setAttribute("aria-label", open ? "Minimize" : "Settings");
  reliefControls.inert = !open;
  reliefControls.setAttribute("aria-hidden", String(!open));
  if (compactImageOptions) compactImageOptions.hidden = open;

  const from = reliefControls.getBoundingClientRect();
  lockReliefPanelSize(from);
  reliefControls.classList.toggle("is-open", open);

  const toWidth = open ? reliefPanelOpenWidth() : RELIEF_PANEL.closedWidth;
  const toHeight = open ? (reliefSheet?.scrollHeight ?? reliefStack.scrollHeight) : 0;

  if (prefersReducedMotion.matches) {
    settleReliefPanel(open, toWidth, toHeight);
    return;
  }

  await Promise.all([
    animateReliefShell(from, toWidth, toHeight, open),
    animateReliefSheet(open, fromOpacity),
  ]);
  if (generation !== reliefPanelGeneration) return;
  settleReliefPanel(open, toWidth, toHeight);
}

reliefToggle?.addEventListener("click", () => {
  reliefPanelOpen = !reliefPanelOpen;
  animateReliefPanel(reliefPanelOpen);
});

reliefControls?.querySelector("[data-reset-relief]")?.addEventListener("click", () => {
  clearSavedSettings(activeImageId);
  applyReliefSettings(sourceSampleDefaults(getSource(activeImageId)));
  rebuildField();
});

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const download = document.createElement("a");
  download.download = filename;
  download.href = href;
  download.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

function renderExportFrame() {
  renderView(true);
}

function flattenExportFrame(context, width, height) {
  if (!controlChecked("snap-blue", true)) return;
  const ink = hexToRgb(controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]));
  const fill = hexToRgb(controlHex("background", RELIEF_DEFAULTS.background));
  const stripHeight = Math.max(1, Math.min(height, Math.floor(4_000_000 / Math.max(width, 1))));
  for (let y = 0; y < height; y += stripHeight) {
    const rows = Math.min(stripHeight, height - y);
    const image = context.getImageData(0, y, width, rows);
    const data = image.data;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] - fill.r;
      const green = data[index + 1] - fill.g;
      const blue = data[index + 2] - fill.b;
      const nearFill = red * red + green * green + blue * blue < 1600;
      const swatch = nearFill ? fill : ink;
      data[index] = swatch.r;
      data[index + 1] = swatch.g;
      data[index + 2] = swatch.b;
      data[index + 3] = 255;
    }
    context.putImageData(image, 0, y);
  }
}

function evenSize(value) {
  return Math.max(2, Math.round(value / 2) * 2);
}

function selectedExportFormat() {
  const id = controlText("export-format", VIDEO_EXPORT.format);
  return EXPORT_FORMATS[id] ?? EXPORT_FORMATS.webm;
}

function selectedExportSize() {
  const id = controlText("export-size", "square");
  return EXPORT_SIZES[id] ?? EXPORT_SIZES.square;
}

function exportDimensions() {
  const size = selectedExportSize();
  return {
    width: evenSize(size.width),
    height: evenSize(size.height),
    extra: 1,
  };
}

function currentViewExportSize() {
  const cssWidth = Math.max(1, sceneElement.clientWidth);
  const cssHeight = Math.max(1, sceneElement.clientHeight);
  const aspect = cssWidth / cssHeight;
  const liveLong = Math.max(cssWidth, cssHeight) * Math.min(window.devicePixelRatio || 1, 2);
  const longEdge = evenSize(Math.min(maxGpuEdge(), Math.max(liveLong, 2560)));
  if (aspect >= 1) {
    return {
      width: longEdge,
      height: evenSize(longEdge / aspect),
      cssWidth,
      cssHeight,
    };
  }
  return {
    width: evenSize(longEdge * aspect),
    height: longEdge,
    cssWidth,
    cssHeight,
  };
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => window.setTimeout(resolve, 0));
  });
}

function maxGpuEdge() {
  const gl = renderer.getContext();
  const texture = renderer.capabilities.maxTextureSize;
  let renderbuffer = texture;
  let viewportMax = texture;
  try {
    renderbuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || texture;
    const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if (dims && dims.length >= 2) viewportMax = Math.min(dims[0], dims[1]);
  } catch {
    // Keep the texture cap if the extra limits are unavailable.
  }
  return Math.max(2048, Math.min(texture, renderbuffer, viewportMax, 16384));
}

function maxGpuPointSize() {
  try {
    const gl = renderer.getContext();
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    return range?.[1] ?? 64;
  } catch {
    return 64;
  }
}

function largestDotWorldSize() {
  const sizes = points?.geometry.getAttribute("aSize");
  if (!sizes) return 0;
  let largest = 0;
  for (let index = 0; index < sizes.count; index += 1) {
    largest = Math.max(largest, sizes.getX(index));
  }
  return largest * controlValue("dot-scale");
}

function fitBannerSize(longEdge) {
  const aspect = sceneElement.clientWidth / Math.max(sceneElement.clientHeight, 1);
  let width = aspect >= 1 ? longEdge : longEdge * aspect;
  let height = aspect >= 1 ? longEdge / aspect : longEdge;
  const pixels = width * height;
  if (pixels > BANNER_EXPORT.maxPixels) {
    const scale = Math.sqrt(BANNER_EXPORT.maxPixels / pixels);
    width *= scale;
    height *= scale;
  }
  return {
    width: evenSize(width),
    height: evenSize(height),
  };
}

function bannerSizeCandidates() {
  const target = BANNER_EXPORT.longEdgeInches * BANNER_EXPORT.dpi;
  const gpu = maxGpuEdge();
  const edges = [];
  for (const edge of [target, ...BANNER_EXPORT.fallbackEdges]) {
    const capped = Math.min(edge, gpu);
    if (capped >= 2048 && !edges.includes(capped)) edges.push(capped);
  }
  return edges.map(fitBannerSize);
}

function createExportCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  if (canvas.width !== width || canvas.height !== height) return null;
  const context = canvas.getContext("2d", {
    alpha: false,
    colorSpace: "srgb",
  });
  if (!context) return null;
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode PNG."));
    }, "image/png");
  });
}

function createPrintDots() {
  if (!points) return null;
  const position = points.geometry.getAttribute("position");
  const size = points.geometry.getAttribute("aSize");
  if (!position || !size) return null;

  const geometry = new THREE.CircleGeometry(0.5, 18);
  const material = new THREE.MeshBasicMaterial({
    color: controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]),
    depthTest: true,
    depthWrite: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, position.count);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const scale = controlValue("dot-scale") * Math.sqrt(0.92);
  for (let index = 0; index < position.count; index += 1) {
    dummy.position.fromBufferAttribute(position, index);
    dummy.quaternion.copy(camera.quaternion);
    dummy.scale.setScalar(size.getX(index) * scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function disposePrintDots(mesh) {
  if (!mesh) return;
  field.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}

function indexGifFrame(imageData, fill) {
  const index = new Uint8Array(imageData.width * imageData.height);
  const data = imageData.data;
  for (let pixel = 0, offset = 0; offset < data.length; pixel += 1, offset += 4) {
    const red = data[offset] - fill.r;
    const green = data[offset + 1] - fill.g;
    const blue = data[offset + 2] - fill.b;
    index[pixel] = red * red + green * green + blue * blue < 1600 ? 0 : 1;
  }
  return index;
}

async function exportReliefGif({
  compositeCanvas,
  compositeContext,
  width,
  height,
  frameCount,
  frameDuration,
  viewerFill,
  startTime,
  startOffset,
}) {
  const gif = GIFEncoder();
  const delay = Math.max(20, Math.round(frameDuration * 1000));
  const fill = hexToRgb(viewerFill);
  const ink = hexToRgb(controlHex("dot-color", RELIEF_DEFAULTS["dot-color"]));
  const snap = controlChecked("snap-blue", true);
  const palette = snap ? [[fill.r, fill.g, fill.b], [ink.r, ink.g, ink.b]] : null;
  const orbitAngles = controlChecked("orbit") ? easedOrbitAngles(frameCount) : null;
  const xzRadius = Math.hypot(startOffset.x, startOffset.z);

  for (let frame = 0; frame < frameCount; frame += 1) {
    applyExportCamera(frame, startOffset, orbitAngles, xzRadius);
    renderExportFrame(startTime + frame * frameDuration, width, height);
    compositeContext.fillStyle = viewerFill;
    compositeContext.fillRect(0, 0, width, height);
    compositeContext.drawImage(renderer.domElement, 0, 0, width, height);
    drawRegionOverlay(compositeContext, width, height, {
      clear: false,
      time: startTime + frame * frameDuration,
    });
    flattenExportFrame(compositeContext, width, height);
    const image = compositeContext.getImageData(0, 0, width, height);
    const framePalette = palette ?? quantize(image.data, 32);
    gif.writeFrame(
      palette ? indexGifFrame(image, fill) : applyPalette(image.data, framePalette),
      width,
      height,
      {
        palette: frame === 0 || !palette ? framePalette : undefined,
        delay,
        repeat: 0,
      },
    );
    setExportProgress(((frame + 1) / frameCount) * 100, true);
    if (frame % 4 === 3) await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  gif.finish();
  return gif.bytes();
}

async function exportReliefPng() {
  if (!exportVideoButton || exportVideoButton.disabled) return;
  if (!points) {
    window.alert("Load an image before exporting a PNG.");
    return;
  }

  const viewerFill = controlHex("background", RELIEF_DEFAULTS.background);
  const previousClear = {
    color: renderer.getClearColor(new THREE.Color()),
    alpha: renderer.getClearAlpha(),
  };
  const previousDamping = controls.enableDamping;
  const viewWidth = sceneElement.clientWidth;
  const viewHeight = sceneElement.clientHeight;
  const viewRatio = Math.min(window.devicePixelRatio || 1, 2);
  const size = currentViewExportSize();
  let printDots = null;

  isExportingVideo = true;
  exportVideoButton.disabled = true;
  setExportProgress(8, true, "Capturing");
  renderer.setAnimationLoop(null);
  controls.autoRotate = false;
  controls.enableDamping = false;
  await waitForPaint();

  try {
    const surface = createExportCanvas(size.width, size.height);
    if (!surface) throw new Error("Could not allocate an export canvas.");

    renderer.setClearColor(viewerFill, 1);
    setRenderSize(size.width, size.height, 1, false);

    const estimatedDot = largestDotWorldSize() * (size.height / VIEW_HEIGHT) * camera.zoom;
    if (estimatedDot > maxGpuPointSize() * 0.95) {
      printDots = createPrintDots();
      if (printDots) {
        points.visible = false;
        field.add(printDots);
      }
    }

    setExportProgress(28, true, `${size.width}×${size.height}`);
    await waitForPaint();
    renderView();

    surface.context.fillStyle = viewerFill;
    surface.context.fillRect(0, 0, size.width, size.height);
    surface.context.drawImage(renderer.domElement, 0, 0, size.width, size.height);
    drawRegionOverlay(surface.context, size.width, size.height, {
      clear: false,
      time: clock.elapsedTime,
    });

    setExportProgress(62, true, "Flattening");
    await waitForPaint();
    flattenExportFrame(surface.context, size.width, size.height);

    setExportProgress(84, true, "Encoding");
    await waitForPaint();
    const blob = await canvasToPngBlob(surface.canvas);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(
      blob,
      `${activeImageId ?? "relief"}-${size.width}x${size.height}-${timestamp}.png`,
    );
    setExportProgress(100, true, "Done");
  } catch (error) {
    console.error(error);
    window.alert("PNG export failed.");
  } finally {
    if (printDots) disposePrintDots(printDots);
    if (points) points.visible = true;
    controls.enableDamping = previousDamping;
    controls.update();
    renderer.setClearColor(previousClear.color, previousClear.alpha);
    pointMaterial.uniforms.uMinPointSize.value = 1.2;
    isExportingVideo = false;
    setRenderSize(viewWidth, viewHeight, viewRatio);
    exportVideoButton.disabled = false;
    setExportProgress(0, false);
    renderer.setAnimationLoop(animate);
  }
}

async function exportReliefVideo() {
  if (!exportVideoButton || exportVideoButton.disabled) return;

  const format = selectedExportFormat();
  const { width, height } = exportDimensions();
  const quality = new Quality("very-high");
  const codec = format.codecs
    ? await getFirstEncodableVideoCodec(format.codecs, { width, height, quality })
    : null;
  if (format.codecs && (typeof VideoEncoder === "undefined" || !codec)) {
    window.alert(`${format.id.toUpperCase()} export needs a browser that can encode ${format.codecs.join(" or ")}.`);
    return;
  }

  const fps = Math.round(controlValue("export-fps"));
  const duration = Math.round(controlValue("export-duration"));
  const frameCount = fps * duration;
  const viewerFill = controlHex("background", RELIEF_DEFAULTS.background);
  const frameDuration = 1 / fps;
  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const compositeContext = compositeCanvas.getContext("2d", {
    alpha: false,
    colorSpace: "srgb",
  });
  if (!compositeContext) {
    window.alert("Could not create the export canvas.");
    return;
  }
  compositeContext.imageSmoothingEnabled = false;

  const previousPosition = camera.position.clone();
  const previousQuaternion = camera.quaternion.clone();
  const previousDamping = controls.enableDamping;
  const previousClear = {
    color: renderer.getClearColor(new THREE.Color()),
    alpha: renderer.getClearAlpha(),
  };
  const startOffset = camera.position.clone().sub(controls.target);
  const startTime = clock.elapsedTime;
  let output = null;

  isExportingVideo = true;
  exportVideoButton.disabled = true;
  setExportProgress(0, true);
  renderer.setAnimationLoop(null);
  controls.autoRotate = false;
  controls.enableDamping = false;

  try {
    renderer.setClearColor(viewerFill, 1);
    setRenderSize(width, height, 1, false);

    let file = null;
    if (format.id === "gif") {
      file = await exportReliefGif({
        compositeCanvas,
        compositeContext,
        width,
        height,
        frameCount,
        frameDuration,
        viewerFill,
        startTime,
        startOffset,
      });
    } else {
      const target = new BufferTarget();
      output = new Output({
        format: format.format(),
        target,
      });
      const videoSource = new CanvasSource(compositeCanvas, {
        codec,
        quality,
        keyFrameInterval: 2,
      });
      output.addVideoTrack(videoSource, { frameRate: fps });
      const orbitAngles = controlChecked("orbit") ? easedOrbitAngles(frameCount) : null;
      const xzRadius = Math.hypot(startOffset.x, startOffset.z);
      await output.start();

      for (let frame = 0; frame < frameCount; frame += 1) {
        applyExportCamera(frame, startOffset, orbitAngles, xzRadius);
        renderExportFrame(startTime + frame * frameDuration, width, height);
        compositeContext.fillStyle = viewerFill;
        compositeContext.fillRect(0, 0, width, height);
        compositeContext.drawImage(renderer.domElement, 0, 0, width, height);
        drawRegionOverlay(compositeContext, width, height, {
          clear: false,
          time: startTime + frame * frameDuration,
        });
        flattenExportFrame(compositeContext, width, height);
        await videoSource.add(frame * frameDuration, frameDuration);
        setExportProgress(((frame + 1) / frameCount) * 100, true);
      }

      videoSource.close();
      await output.finalize();
      if (!target.buffer) throw new Error("Export produced an empty file.");
      file = target.buffer;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(
      new Blob([file], { type: format.mime }),
      `${activeImageId ?? "relief"}-${width}x${height}-${timestamp}.${format.extension}`,
    );
  } catch (error) {
    console.error(error);
    try {
      await output?.cancel();
    } catch {
      // The output may already be finalized or canceled.
    }
    window.alert("Video export failed.");
  } finally {
    camera.position.copy(previousPosition);
    camera.quaternion.copy(previousQuaternion);
    camera.lookAt(controls.target);
    controls.enableDamping = previousDamping;
    controls.update();
    renderer.setClearColor(previousClear.color, previousClear.alpha);
    pointMaterial.uniforms.uMinPointSize.value = 1.2;
    isExportingVideo = false;
    updateSize();
    exportVideoButton.disabled = false;
    setExportProgress(0, false);
    renderer.setAnimationLoop(animate);
  }
}

exportVideoButton?.addEventListener("click", () => {
  if (selectedExportFormat().still) {
    exportReliefPng();
    return;
  }
  exportReliefVideo();
});

const resizeObserver = new ResizeObserver(() => {
  updateSize();
  if (reliefPanelOpen && !reliefPanelAnimating && reliefControls) {
    reliefControls.style.width = `${reliefPanelOpenWidth()}px`;
  }
  updateReliefScrollHint();
});
resizeObserver.observe(sceneElement);
updateSize();
applyDotColor();
applyBackground();
applyMetricsVisibility();
syncRefineControls();
updateControlLabels();
setupRegionDrawing();

const requestedImage = pageParams.get("image");
renderImageLibrary();

hydrateUploadedImages().then(() => {
  if (LOCKED_IMAGE === "face") bindFaceSourceFromUploads();
  const startId = hasSource(requestedImage)
    ? requestedImage
    : LOCKED_IMAGE && hasSource(LOCKED_IMAGE)
      ? LOCKED_IMAGE
      : hasSource(readRememberedImage())
        ? readRememberedImage()
        : "antibody";
  loadSource(startId);
});
