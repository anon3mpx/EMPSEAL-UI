// ─── Mobile landing visuals — lightweight 2D ports of the stage's art ─────
//
// The desktop stage renders through landingV4Engine (WebGL halftone + scroll
// timeline), which can't run on a narrow screen. These reproduce two of its
// looks on plain 2D canvases: the dithered density art from the "How value
// settles" tiles (formulas and palette copied from the engine's DEN/BAY), and
// the hero's halftone EmpX mark (palette from the engine's POST shader).
// Both pause off-screen and render a single still frame under reduced motion.

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

type Density = (x: number, y: number, t: number) => number;

// Mirrors landingV4Engine.ts DEN — keep the two in step.
const DEN = {
  swap: (x, y, t) => {
    let d = 0;
    for (let k = 0; k < 2; k++) {
      const a = t * 0.35 + k * Math.PI;
      const ox = Math.cos(a) * 0.3, oy = Math.sin(a) * 0.17;
      d = Math.max(d, 1 - Math.min(1, Math.abs(Math.hypot(x - ox, y - oy) - 0.46) / 0.19));
    }
    return d * d;
  },
  cross: (x, y, t) => {
    const yy = y - (-0.42 + 0.9 * x * x);
    let d = 1 - Math.min(1, Math.abs(yy) / 0.22);
    for (let k = -1; k <= 1; k += 2) d = Math.max(d, 1 - Math.min(1, Math.hypot(x - k * 0.62, y - 0.34) / 0.3));
    const ph = ((x + 1) / 2 + t * 0.16) % 1;
    d = Math.max(d, (1 - Math.min(1, Math.abs(x - (ph * 2 - 1)) / 0.1)) * (1 - Math.min(1, Math.abs(yy) / 0.16)) * 1.2);
    return Math.min(1, d) * 0.95;
  },
  agents: (x, y, t) => {
    const r = Math.hypot(x, y), a = Math.atan2(y, x);
    let d = 1 - Math.min(1, r / 0.3);
    const w = Math.sin(a * 7 + t * 0.7) * 0.13;
    d = Math.max(d, (1 - Math.min(1, Math.abs(r - (0.55 + w)) / 0.13)) * Math.max(0, 1 - r * 0.7));
    d = Math.max(d, (1 - Math.min(1, Math.abs(r - (0.85 + w * 1.4)) / 0.1)) * 0.7);
    return Math.min(1, d);
  },
  embed: (x, y, t) => {
    const s = Math.max(Math.abs(x), Math.abs(y));
    const k = (s * 3.4 - t * 0.22) % 1;
    let d = 1 - Math.min(1, Math.abs(k - 0.5) / 0.21);
    d *= Math.max(0, 1 - s * 0.4);
    d = Math.max(d, (1 - Math.min(1, s / 0.13)) * 0.95);
    return Math.min(1, d * 1.18);
  },
} satisfies Record<string, Density>;

export type DensityArt = keyof typeof DEN;

/** Sizes the canvas to its CSS box and runs `render` while it is on screen. */
function animate(
  canvas: HTMLCanvasElement,
  render: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let w = 0, h = 0, visible = true, raf = 0;

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduced) frame(0);
  };
  const frame = (t: number) => {
    ctx.clearRect(0, 0, w, h);
    render(ctx, w, h, t * 0.001);
  };
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    if (visible && w && h) frame(t);
  };

  const observer = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; });
  observer.observe(canvas);
  window.addEventListener("resize", fit);
  fit();
  if (!reduced) raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener("resize", fit);
  };
}

/** Dithered density art, as drawn in the desktop stage's layer tiles. */
export function mountDensityArt(canvas: HTMLCanvasElement, art: DensityArt): () => void {
  const fn: Density = DEN[art];
  const CELL = 3;
  return animate(canvas, (ctx, w, h, t) => {
    const cols = Math.floor(w / CELL), rows = Math.floor(h / CELL);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const d = fn((gx / cols - 0.5) * 2, (gy / rows - 0.5) * 2, t);
        if (d <= 0.02 || d <= (BAY[(gy & 3) * 4 + (gx & 3)] + 0.5) / 16) continue;
        ctx.fillStyle = d > 0.86 ? "#F2E6D8" : d > 0.55 ? "#E39B3C" : "#C87400";
        ctx.globalAlpha = Math.min(1, 0.28 + d * 0.66);
        ctx.fillRect(gx * CELL, gy * CELL, CELL - 1, CELL - 1);
      }
    }
    ctx.globalAlpha = 1;
  });
}

/** The EmpX mark as an orange halftone dot field with a slow shimmer. */
export function mountHalftoneMark(canvas: HTMLCanvasElement, src: string, columns = 46): () => void {
  let cells: Float32Array | null = null;
  let gridW = 0, gridH = 0;
  const image = new Image();
  image.onload = () => {
    gridW = columns;
    gridH = Math.max(1, Math.round(columns * (image.height / image.width)));
    const sample = document.createElement("canvas");
    sample.width = gridW;
    sample.height = gridH;
    const sctx = sample.getContext("2d");
    if (!sctx) return;
    sctx.drawImage(image, 0, 0, gridW, gridH);
    const px = sctx.getImageData(0, 0, gridW, gridH).data;
    cells = new Float32Array(gridW * gridH);
    for (let i = 0; i < cells.length; i++) {
      const lum = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
      cells[i] = (px[i * 4 + 3] / 255) * (0.45 + 0.55 * lum);
    }
  };
  image.src = src;

  // Shader palette: lo vec3(0.63,0.32,0.02) → hi vec3(0.90,0.55,0.16).
  const lo = [161, 82, 5], hi = [230, 140, 41];
  return animate(canvas, (ctx, w, h, t) => {
    if (!cells) return;
    const cell = Math.min(w / gridW, h / gridH);
    const ox = (w - cell * gridW) / 2, oy = (h - cell * gridH) / 2;
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const v = cells[gy * gridW + gx];
        if (v < 0.06) continue;
        const wave = 0.5 + 0.5 * Math.sin(t * 1.4 - gx * 0.22 - gy * 0.16);
        const l = Math.min(1, v * (0.78 + 0.32 * wave));
        const r = cell * 0.5 * Math.min(0.95, 0.35 + l * 0.6);
        const mix = (i: number) => Math.round(lo[i] + (hi[i] - lo[i]) * l);
        ctx.fillStyle = `rgb(${mix(0)},${mix(1)},${mix(2)})`;
        ctx.beginPath();
        ctx.arc(ox + (gx + 0.5) * cell, oy + (gy + 0.5) * cell, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}
