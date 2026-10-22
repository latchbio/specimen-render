import "./flower-dither.css";

const IMAGE_SOURCES = {
  "flower-color": "/images/flower-color.png",
  "bird-of-paradise": "/images/bird-of-paradise.png",
};
const DEFAULTS = {
  source: "bird-of-paradise",
  style: "pixels",
  detail: 1,
  "glyph-size": 10,
  contrast: 1.1,
  threshold: 50,
  invert: false,
  rings: true,
  "ring-spacing": 11,
  "ring-shift": 8,
  "center-x": 50,
  "center-y": 54,
  "image-scale": 100,
  "ink-color": "#ffffff",
  "background-color": "#000000",
  "ring-weight": 2,
  "white-only": true,
  "export-scale": 4,
};
const MAX_SAMPLE_PIXELS = 20_000_000;

const canvas = document.querySelector("[data-dither-canvas]");
const stage = document.querySelector(".dither-stage");
const controls = document.querySelector(".dither-controls");
const loading = document.querySelector("[data-loading]");
const dimensions = document.querySelector("[data-dimensions]");
const context = canvas.getContext("2d");
const workCanvas = document.createElement("canvas");
const workContext = workCanvas.getContext("2d", {
  willReadFrequently: true,
});

let sourceImage = null;
let renderFrame = null;
let draggingRingCenter = false;
let effectCenter = { x: 0.5, y: 0.54 };
let imagePlacement = { x: 0, y: 0, width: 1, height: 1 };
let imageLoadToken = 0;

function numberValue(name) {
  return Number(controls.querySelector(`[name="${name}"]`).value);
}

function checkedValue(name) {
  return controls.querySelector(`[name="${name}"]`).checked;
}

function textValue(name) {
  return controls.querySelector(`[name="${name}"]`).value;
}

function rgbValue(name) {
  const hex = textValue(name).replace("#", "");
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function updateLabels() {
  controls.querySelectorAll("[data-value]").forEach((output) => {
    const name = output.dataset.value;
    const value = numberValue(name);
    if (name === "detail") output.value = `${value} px`;
    if (name === "glyph-size") output.value = `${value} px`;
    if (name === "contrast") output.value = value.toFixed(2);
    if (name === "threshold") output.value = `${value}%`;
    if (name === "ring-spacing") output.value = `${value}%`;
    if (name === "ring-shift") output.value = `${Math.round(value)}°`;
    if (name === "center-x" || name === "center-y") output.value = `${Math.round(value)}%`;
    if (name === "image-scale") output.value = `${Math.round(value)}%`;
    if (name === "ring-weight") output.value = `${value.toFixed(1)} px`;
  });
}

function fitCanvas() {
  if (!sourceImage) return;

  const bounds = stage.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
  canvas.style.width = `${Math.round(width)}px`;
  canvas.style.height = `${Math.round(height)}px`;
  render();
}

function ditherImage(imageData, threshold, contrast, invert, whiteOnly, ink, background) {
  const { data, width, height } = imageData;
  const luma = new Float32Array(width * height);
  const contrastFactor = Math.max(0, contrast);

  for (let pixel = 0, offset = 0; pixel < luma.length; pixel += 1, offset += 4) {
    const alpha = data[offset + 3] / 255;
    const red = data[offset] * alpha;
    const green = data[offset + 1] * alpha;
    const blue = data[offset + 2] * alpha;
    const value = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    luma[pixel] = Math.max(0, Math.min(255, (value - 127.5) * contrastFactor + 127.5));
  }

  const spread = (x, y, error, amount) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    luma[index] = Math.max(0, Math.min(255, luma[index] + error * amount));
  };

  for (let y = 0; y < height; y += 1) {
    const leftToRight = y % 2 === 0;
    const start = leftToRight ? 0 : width - 1;
    const end = leftToRight ? width : -1;
    const direction = leftToRight ? 1 : -1;

    for (let x = start; x !== end; x += direction) {
      const index = y * width + x;
      const oldValue = luma[index];
      const newValue = oldValue < threshold ? 0 : 255;
      const output = invert ? 255 - newValue : newValue;
      const offset = index * 4;
      const color = output ? ink : background;
      data[offset] = color.red;
      data[offset + 1] = color.green;
      data[offset + 2] = color.blue;
      data[offset + 3] = whiteOnly ? output : 255;

      const error = oldValue - newValue;
      spread(x + direction, y, error, 7 / 16);
      spread(x - direction, y + 1, error, 3 / 16);
      spread(x, y + 1, error, 5 / 16);
      spread(x + direction, y + 1, error, 1 / 16);
    }
  }
}

function renderGlyphDither(imageData, threshold, contrast, invert, whiteOnly, sampleRatio) {
  const { data, width, height } = imageData;
  const outputScale = canvas.width / Math.max(canvas.getBoundingClientRect().width, 1);
  const glyphSize = Math.max(1, numberValue("glyph-size") * outputScale * sampleRatio);
  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  workContext.clearRect(0, 0, width, height);
  if (!whiteOnly) {
    workContext.fillStyle = textValue("background-color");
    workContext.fillRect(0, 0, width, height);
  }
  workContext.fillStyle = textValue("ink-color");
  workContext.font = `600 ${glyphSize * 0.9}px "SFMono-Regular", Consolas, monospace`;
  workContext.textAlign = "center";
  workContext.textBaseline = "middle";

  let row = 0;
  for (let y = glyphSize * 0.5; y < height; y += glyphSize, row += 1) {
    let column = 0;
    for (let x = glyphSize * 0.5; x < width; x += glyphSize, column += 1) {
      const px = Math.min(width - 1, Math.floor(x));
      const py = Math.min(height - 1, Math.floor(y));
      const offset = (py * width + px) * 4;
      const alpha = data[offset + 3] / 255;
      const raw = (
        data[offset] * 0.2126 +
        data[offset + 1] * 0.7152 +
        data[offset + 2] * 0.0722
      ) * alpha;
      const adjusted = Math.max(0, Math.min(255, (raw - 127.5) * contrast + 127.5));
      const value = invert ? 255 - adjusted : adjusted;
      const pattern = (bayer[row % 4][column % 4] / 15 - 0.5) * 34;

      let glyph = "";
      if (value + pattern >= threshold) glyph = "0";
      else if (value + pattern >= threshold * 0.38) glyph = ".";
      if (glyph) workContext.fillText(glyph, x, y);
    }
  }
}

function renderDotDither(imageData, threshold, contrast, invert, whiteOnly, sampleRatio) {
  const { data, width, height } = imageData;
  const outputScale = canvas.width / Math.max(canvas.getBoundingClientRect().width, 1);
  const cellSize = Math.max(1, numberValue("glyph-size") * outputScale * sampleRatio);
  const floor = threshold * 0.35;

  workContext.clearRect(0, 0, width, height);
  if (!whiteOnly) {
    workContext.fillStyle = textValue("background-color");
    workContext.fillRect(0, 0, width, height);
  }
  workContext.fillStyle = textValue("ink-color");

  for (let y = cellSize * 0.5; y < height; y += cellSize) {
    for (let x = cellSize * 0.5; x < width; x += cellSize) {
      const px = Math.min(width - 1, Math.floor(x));
      const py = Math.min(height - 1, Math.floor(y));
      const offset = (py * width + px) * 4;
      const alpha = data[offset + 3] / 255;
      const raw = (
        data[offset] * 0.2126 +
        data[offset + 1] * 0.7152 +
        data[offset + 2] * 0.0722
      ) * alpha;
      const adjusted = Math.max(0, Math.min(255, (raw - 127.5) * contrast + 127.5));
      const value = invert ? 255 - adjusted : adjusted;
      const strength = Math.max(0, Math.min(1, (value - floor) / Math.max(1, 255 - floor)));
      if (strength <= 0) continue;

      workContext.beginPath();
      workContext.arc(x, y, cellSize * 0.44 * Math.sqrt(strength), 0, Math.PI * 2);
      workContext.fill();
    }
  }
}

function ringGeometry() {
  const centerX = canvas.width * effectCenter.x;
  const centerY = canvas.height * effectCenter.y;
  const spacing = Math.min(canvas.width, canvas.height) * (numberValue("ring-spacing") / 100);
  const farthestX = Math.max(centerX, canvas.width - centerX);
  const farthestY = Math.max(centerY, canvas.height - centerY);
  const maxRadius = Math.hypot(farthestX, farthestY);
  return { centerX, centerY, spacing, maxRadius };
}

function drawRingComposition() {
  const drawImage = () => {
    context.drawImage(
      workCanvas,
      imagePlacement.x,
      imagePlacement.y,
      imagePlacement.width,
      imagePlacement.height,
    );
  };

  if (!checkedValue("rings")) {
    drawImage();
    return;
  }

  const { centerX, centerY, spacing, maxRadius } = ringGeometry();
  const shift = (numberValue("ring-shift") * Math.PI) / 180;
  let band = 0;

  for (let innerRadius = 0; innerRadius <= maxRadius; innerRadius += spacing) {
    const outerRadius = innerRadius + spacing + 1;
    const rotation = band === 0
      ? 0
      : shift * Math.min(0.55 + band * 0.16, 2.2);

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    if (innerRadius > 0) {
      context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
    }
    context.clip("evenodd");
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.translate(-centerX, -centerY);
    drawImage();
    context.restore();
    band += 1;
  }
}

function drawRingGuides() {
  if (!checkedValue("rings")) return;

  const { centerX, centerY, spacing, maxRadius } = ringGeometry();
  const outputScale = canvas.width / Math.max(canvas.getBoundingClientRect().width, 1);

  context.save();
  context.strokeStyle = textValue("ink-color");
  context.lineWidth = numberValue("ring-weight") * outputScale;
  context.globalAlpha = 0.4;
  for (let radius = spacing; radius <= maxRadius + spacing; radius += spacing) {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function render() {
  if (!sourceImage || !canvas.width || !canvas.height) return;

  const detail = numberValue("detail");
  const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
  let imageWidth = canvas.width;
  let imageHeight = imageWidth / sourceAspect;
  if (imageHeight > canvas.height) {
    imageHeight = canvas.height;
    imageWidth = imageHeight * sourceAspect;
  }
  const imageScale = numberValue("image-scale") / 100;
  imageWidth *= imageScale;
  imageHeight *= imageScale;
  const imageCenterX = canvas.width * (numberValue("center-x") / 100);
  const imageCenterY = canvas.height * (numberValue("center-y") / 100);
  effectCenter = {
    x: imageCenterX / canvas.width,
    y: imageCenterY / canvas.height,
  };
  imagePlacement = {
    x: imageCenterX - imageWidth * 0.5,
    y: imageCenterY - imageHeight * 0.5,
    width: imageWidth,
    height: imageHeight,
  };

  const desiredSampleWidth = imageWidth / detail;
  const desiredSampleHeight = imageHeight / detail;
  const sampleScale = Math.min(
    1,
    Math.sqrt(MAX_SAMPLE_PIXELS / Math.max(1, desiredSampleWidth * desiredSampleHeight)),
  );
  const sampleWidth = Math.max(1, Math.round(desiredSampleWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(desiredSampleHeight * sampleScale));
  const sampleRatio = sampleWidth / imageWidth;
  workCanvas.width = sampleWidth;
  workCanvas.height = sampleHeight;

  workContext.fillStyle = "#000";
  workContext.fillRect(0, 0, sampleWidth, sampleHeight);
  workContext.drawImage(sourceImage, 0, 0, sampleWidth, sampleHeight);

  const imageData = workContext.getImageData(0, 0, sampleWidth, sampleHeight);
  const whiteOnly = checkedValue("white-only");
  const threshold = (numberValue("threshold") / 100) * 255;
  const contrast = numberValue("contrast");
  const invert = checkedValue("invert");
  const ink = rgbValue("ink-color");
  const background = rgbValue("background-color");
  const style = textValue("style");
  if (style === "glyphs") {
    renderGlyphDither(imageData, threshold, contrast, invert, whiteOnly, sampleRatio);
  } else if (style === "dots") {
    renderDotDither(imageData, threshold, contrast, invert, whiteOnly, sampleRatio);
  } else {
    ditherImage(imageData, threshold, contrast, invert, whiteOnly, ink, background);
    workContext.putImageData(imageData, 0, 0);
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!whiteOnly) {
    context.fillStyle = textValue("background-color");
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawRingComposition();
  drawRingGuides();
  stage.classList.toggle("is-transparent", whiteOnly);
  stage.classList.toggle("has-rings", checkedValue("rings"));

  dimensions.textContent = `${sampleWidth} × ${sampleHeight}`;
  loading.hidden = true;
}

function scheduleRender() {
  updateLabels();
  window.cancelAnimationFrame(renderFrame);
  renderFrame = window.requestAnimationFrame(render);
}

function reset() {
  Object.entries(DEFAULTS).forEach(([name, value]) => {
    const input = controls.querySelector(`[name="${name}"]`);
    if (input.type === "checkbox") input.checked = value;
    else input.value = String(value);
  });
  updateLabels();
  loadSelectedSource();
}

function canvasToBlob() {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode PNG"));
    }, "image/png");
  });
}

async function download() {
  const previousWidth = canvas.width;
  const previousHeight = canvas.height;
  const bounds = canvas.getBoundingClientRect();
  const exportScale = Number(textValue("export-scale"));
  const button = controls.querySelector("[data-download]");
  button.disabled = true;

  try {
    canvas.width = Math.max(1, Math.round(bounds.width * exportScale));
    canvas.height = Math.max(1, Math.round(bounds.height * exportScale));
    render();
    const blob = await canvasToBlob();
    const link = document.createElement("a");
    const sourceName = textValue("source");
    link.download = checkedValue("white-only")
      ? `${sourceName}-halftone-transparent-${exportScale}x.png`
      : `${sourceName}-halftone-${exportScale}x.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  } catch (error) {
    console.error(error);
    window.alert("The high-resolution PNG could not be exported.");
  } finally {
    canvas.width = previousWidth;
    canvas.height = previousHeight;
    render();
    button.disabled = false;
  }
}

controls.addEventListener("input", (event) => {
  if (event.target.name === "source") {
    loadSelectedSource();
    return;
  }
  scheduleRender();
});
controls.querySelector("[data-reset]").addEventListener("click", reset);
controls.querySelector("[data-download]").addEventListener("click", download);

function moveRingCenter(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
  controls.querySelector('[name="center-x"]').value = String(Math.round(x));
  controls.querySelector('[name="center-y"]').value = String(Math.round(y));
  scheduleRender();
}

canvas.addEventListener("pointerdown", (event) => {
  if (!checkedValue("rings")) return;
  draggingRingCenter = true;
  canvas.setPointerCapture(event.pointerId);
  moveRingCenter(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (draggingRingCenter) moveRingCenter(event);
});
canvas.addEventListener("pointerup", (event) => {
  draggingRingCenter = false;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointercancel", () => {
  draggingRingCenter = false;
});

const resizeObserver = new ResizeObserver(fitCanvas);
resizeObserver.observe(stage);

function loadSelectedSource() {
  const token = ++imageLoadToken;
  const image = new Image();
  loading.hidden = false;
  loading.textContent = "Processing image…";
  image.addEventListener("load", () => {
    if (token !== imageLoadToken) return;
    sourceImage = image;
    fitCanvas();
  });
  image.addEventListener("error", () => {
    if (token !== imageLoadToken) return;
    loading.textContent = "The source image could not be loaded.";
  });
  image.src = IMAGE_SOURCES[textValue("source")] ?? IMAGE_SOURCES["flower-color"];
}

updateLabels();
loadSelectedSource();
