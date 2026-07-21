
/**
 * FrameCanvas — full-viewport canvas with internal vignette.
 *
 * Key fixes:
 *  1. Full viewport — cube never clips.
 *  2. Vignette drawn INSIDE the canvas using exact #03030a (rgb 3,3,10)
 *     so edges blend pixel-perfectly with the page background.
 *  3. imageSmoothingQuality = "high" for sharper frame rendering.
 *  4. DPR-aware sizing prevents accumulation blur.
 */

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 240;
const FRAME_PATH = (n: number) =>
  `/frames/ezgif-frame-${String(n).padStart(3, "0")}.jpg`;

// Exact page background in rgba — used for vignette blend
const BG_R = 3;
const BG_G = 3;
const BG_B = 10;

export default function FrameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const cssW = useRef(0);
  const cssH = useRef(0);
  const readyRef = useRef(false);

  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imagesRef.current[index];
    if (!img?.complete || !img.naturalWidth) return;

    const W = cssW.current;
    const H = cssH.current;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform — prevents accumulation
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ── 1. Fill background with exact page color before drawing frame
    //       so any transparent/anti-aliased edge matches perfectly
    ctx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Draw frame — cover-fit, never stretched
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const imgAR = img.naturalWidth / img.naturalHeight;
    const canAR = W / H;
    let sw: number, sh: number, sx: number, sy: number;

    if (imgAR > canAR) {
      sh = H;
      sw = H * imgAR;
      sx = (W - sw) / 2;
      sy = 0;
    } else {
      sw = W;
      sh = W / imgAR;
      sx = 0;
      sy = (H - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh);

    // ── 3. Draw vignette ON the canvas — exact #03030a, seamless blend
    //       Radial gradient: transparent at cube centre → solid bg at edges
    const cx = W * 0.5;
    const cy = H * 0.5;
    const innerR = Math.min(W, H) * 0.32;
    const outerR = Math.max(W, H) * 0.78;

    const vignette = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    vignette.addColorStop(0,   `rgba(${BG_R},${BG_G},${BG_B},0)`);
    vignette.addColorStop(0.5, `rgba(${BG_R},${BG_G},${BG_B},0.25)`);
    vignette.addColorStop(0.75,`rgba(${BG_R},${BG_G},${BG_B},0.65)`);
    vignette.addColorStop(1,   `rgba(${BG_R},${BG_G},${BG_B},1)`);

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // ── 4. Extra edge strips — ensure hard edges are fully opaque
    //       (fixes any sub-pixel leakage at canvas border)
    const edgePad = 2;
    ctx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`;
    ctx.fillRect(0, 0, W, edgePad);          // top
    ctx.fillRect(0, H - edgePad, W, edgePad); // bottom
    ctx.fillRect(0, 0, edgePad, H);           // left
    ctx.fillRect(W - edgePad, 0, edgePad, H); // right
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement?.offsetWidth || window.innerWidth;
    const H = canvas.parentElement?.offsetHeight || window.innerHeight;
    cssW.current = W;
    cssH.current = H;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (readyRef.current) draw(frameRef.current);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const images: HTMLImageElement[] = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i + 1);
      img.onload = () => {
        if (i === 0) {
          readyRef.current = true;
          draw(0);
        }
      };
      images[i] = img;
    }
    imagesRef.current = images;

    const trigger = ScrollTrigger.create({
      trigger: "#frame-scroll-zone",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        const idx = Math.min(
          Math.round(self.progress * (TOTAL_FRAMES - 1)),
          TOTAL_FRAMES - 1
        );
        if (idx !== frameRef.current) {
          frameRef.current = idx;
          draw(idx);
        }
      },
    });

    return () => {
      trigger.kill();
      window.removeEventListener("resize", resize);
    };
  }, [draw, resize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
      aria-label="EMPX 3D animation"
    />
  );
}
