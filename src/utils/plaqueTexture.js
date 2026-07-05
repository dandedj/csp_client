/**
 * Canvas-generated engraved plaque faces for the 3D walk.
 *
 * Each virtual plaque shows its own inscription rendered onto a warm bronze
 * canvas, so the walk reads like the real park rather than a wall of photos.
 * Generation is local (no network, no CORS) but the resulting texture still
 * lives on the GPU, so callers keep bounding it with the texture LRU.
 *
 * The layout maths (`computePlaqueLayout`, `splitLines`) is pure and takes an
 * injected text-measuring function, so it is unit-testable without a real
 * canvas. The drawing (`renderPlaqueCanvas`) needs a 2-D context and is only
 * exercised in the browser.
 */

const CANVAS_WIDTH = 512;

const BRONZE_TOP = '#b9a87e';
const BRONZE_BOTTOM = '#a6926a';
const BORDER_COLOR = 'rgba(58, 47, 30, 0.65)';
const ENGRAVE_COLOR = '#3a2f1e';
const HIGHLIGHT_COLOR = 'rgba(255, 246, 227, 0.4)';
const SCREW_COLOR = 'rgba(46, 37, 22, 0.7)';
const SCREW_HIGHLIGHT = 'rgba(255, 246, 227, 0.35)';

const FONT_STACK = "'EB Garamond', Garamond, Georgia, serif";
const FONT_FACE = `600 48px ${FONT_STACK}`;

const DEFAULTS = {
  minFont: 20,
  maxFont: 54,
  paddingRatio: 0.09,
  lineHeightRatio: 1.32,
  referenceFont: 100,
  minAspect: 0.42 // shortest allowed height / width, so one-word plaques aren't slivers
};

/**
 * Split inscription text into display lines, preserving interior line breaks
 * but trimming blank lines at the top and bottom.
 *
 * @param {string} text Raw inscription text.
 * @returns {string[]} Lines to render (always at least one).
 */
export function splitLines(text) {
  const lines = (typeof text === 'string' ? text : '').replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines.length ? lines : [''];
}

/**
 * Compute the canvas dimensions, font size, and line metrics for a plaque
 * face. The font size auto-shrinks so the widest line fits, and is clamped so
 * short inscriptions don't balloon.
 *
 * @param {string} text Inscription text.
 * @param {number} width Canvas width in pixels.
 * @param {(line: string, fontSize: number) => number} measure Returns the
 *   pixel width of `line` rendered at `fontSize` in the plaque font.
 * @param {object} [options] Overrides for the layout constants.
 * @returns {{lines: string[], width: number, height: number, fontSize: number,
 *   lineHeight: number, padding: number, aspect: number}}
 */
export function computePlaqueLayout(text, width, measure, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const lines = splitLines(text);
  const padding = Math.round(width * config.paddingRatio);
  const maxTextWidth = width - padding * 2;

  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, measure(line, config.referenceFont));
  }

  let fontSize = widest > 0 ? (maxTextWidth * config.referenceFont) / widest : config.maxFont;
  fontSize = Math.floor(fontSize);
  fontSize = Math.min(Math.max(fontSize, config.minFont), config.maxFont);

  const lineHeight = Math.round(fontSize * config.lineHeightRatio);
  const textBlock = lines.length * lineHeight;
  const minHeight = Math.round(width * config.minAspect);
  const height = Math.max(padding * 2 + textBlock, minHeight);

  return {
    lines,
    width,
    height,
    fontSize,
    lineHeight,
    padding,
    aspect: height / width
  };
}

function drawScrew(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = SCREW_COLOR;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = SCREW_HIGHLIGHT;
  ctx.fill();
}

/**
 * Render a plaque inscription onto a fresh bronze canvas and return it.
 * Assumes the plaque font is already loaded (see `ensurePlaqueFont`).
 *
 * @param {string} text Inscription text.
 * @param {object} [options] Layout overrides.
 * @returns {HTMLCanvasElement} The drawn canvas.
 */
export function renderPlaqueCanvas(text, options = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const measure = (line, fontSize) => {
    ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
    return ctx.measureText(line).width;
  };
  const layout = computePlaqueLayout(text, CANVAS_WIDTH, measure, options);

  canvas.width = layout.width;
  canvas.height = layout.height;

  // Bronze background with a subtle vertical gradient.
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, BRONZE_TOP);
  gradient.addColorStop(1, BRONZE_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Thin dark inset border.
  const inset = Math.round(layout.width * 0.035);
  ctx.lineWidth = Math.max(2, Math.round(layout.width * 0.006));
  ctx.strokeStyle = BORDER_COLOR;
  ctx.strokeRect(inset, inset, layout.width - inset * 2, layout.height - inset * 2);

  // Four corner screws.
  const screwR = Math.max(3, Math.round(layout.width * 0.012));
  const screwPad = inset + screwR * 1.6;
  drawScrew(ctx, screwPad, screwPad, screwR);
  drawScrew(ctx, layout.width - screwPad, screwPad, screwR);
  drawScrew(ctx, screwPad, layout.height - screwPad, screwR);
  drawScrew(ctx, layout.width - screwPad, layout.height - screwPad, screwR);

  // Engraved inscription: a faint light offset below each glyph, dark on top.
  ctx.font = `600 ${layout.fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const centerX = layout.width / 2;
  const textBlock = layout.lines.length * layout.lineHeight;
  let y = (layout.height - textBlock) / 2 + layout.lineHeight / 2;
  for (const line of layout.lines) {
    ctx.fillStyle = HIGHLIGHT_COLOR;
    ctx.fillText(line, centerX, y + 1);
    ctx.fillStyle = ENGRAVE_COLOR;
    ctx.fillText(line, centerX, y);
    y += layout.lineHeight;
  }

  return canvas;
}

/**
 * Draw a small blank bronze plate (gradient, border, screws, no text) used as
 * the shared placeholder texture for plaques whose face has not streamed in.
 *
 * @returns {HTMLCanvasElement}
 */
export function renderBlankPlaqueCanvas(width = 256, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, BRONZE_TOP);
  gradient.addColorStop(1, BRONZE_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const inset = Math.round(width * 0.035);
  ctx.lineWidth = Math.max(2, Math.round(width * 0.006));
  ctx.strokeStyle = BORDER_COLOR;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  const screwR = Math.max(2, Math.round(width * 0.012));
  const screwPad = inset + screwR * 1.6;
  drawScrew(ctx, screwPad, screwPad, screwR);
  drawScrew(ctx, width - screwPad, screwPad, screwR);
  drawScrew(ctx, screwPad, height - screwPad, screwR);
  drawScrew(ctx, width - screwPad, height - screwPad, screwR);
  return canvas;
}

/**
 * Ensure the plaque font is loaded before the first faces are drawn, so early
 * textures don't rasterise in a fallback font. Resolves even if the Font
 * Loading API is unavailable or the load fails (drawing then falls back to the
 * serif stack rather than blocking the walk).
 *
 * @returns {Promise<void>}
 */
export function ensurePlaqueFont() {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
    return Promise.resolve();
  }
  return document.fonts.load(FONT_FACE).then(
    () => undefined,
    () => undefined
  );
}
