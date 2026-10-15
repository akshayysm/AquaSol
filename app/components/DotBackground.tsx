"use client";

import { useEffect, useRef } from "react";

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [92, 106, 114];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const SPACING = 20;
const RADIUS = 1.7;
const LEVELS = 24;
const GLOW_START = Math.floor(LEVELS * 0.62);
const SPEED_MIN = 0.3;
const SPEED_MAX = 0.95;

export default function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const fg = hexToRgb(
      styles.getPropertyValue("--foreground").trim() || "#5C6A72"
    );
    const aqua = hexToRgb(
      styles.getPropertyValue("--aqua").trim() || "#35A77C"
    );

    const dotColors: string[] = [];
    const haloColors: (string | null)[] = [];
    const haloRadii: number[] = [];
    for (let i = 0; i < LEVELS; i++) {
      const e = i / (LEVELS - 1);
      const mix = Math.pow(e, 1.5) * 0.75;
      const r = Math.round(fg[0] + (aqua[0] - fg[0]) * mix);
      const g = Math.round(fg[1] + (aqua[1] - fg[1]) * mix);
      const b = Math.round(fg[2] + (aqua[2] - fg[2]) * mix);
      dotColors.push(`rgba(${r},${g},${b},${(0.06 + e * 0.28).toFixed(3)})`);
      if (i >= GLOW_START) {
        const e2 = (i - GLOW_START) / (LEVELS - 1 - GLOW_START);
        haloColors.push(
          `rgba(${aqua[0]},${aqua[1]},${aqua[2]},${(0.04 + e2 * 0.13).toFixed(3)})`
        );
        haloRadii.push(RADIUS * (1.7 + e2 * 1.3));
      } else {
        haloColors.push(null);
        haloRadii.push(0);
      }
    }

    const DIM_LEVELS = 10;
    const dimColors: string[] = [];
    for (let j = 0; j < DIM_LEVELS; j++) {
      const a = 0.06 + (j / (DIM_LEVELS - 1)) * 0.1;
      dimColors.push(
        `rgba(${fg[0]},${fg[1]},${fg[2]},${a.toFixed(3)})`
      );
    }

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let speeds = new Float32Array(0);
    let phases = new Float32Array(0);
    let gates = new Float32Array(0);

    function initDots() {
      const count = cols * rows;
      speeds = new Float32Array(count);
      phases = new Float32Array(count);
      gates = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        speeds[i] = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
        phases[i] = Math.random() * Math.PI * 2;
        gates[i] = 0.88 + Math.random() * 0.1;
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;
      initDots();
    }
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let start = -1;
    let raf = 0;

    function frame(now: number) {
      if (start < 0) start = now;
      const t = reduced ? 0 : (now - start) / 1000;

      ctx!.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row++) {
        const y = row * SPACING;
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const pulse = (Math.sin(t * speeds[i] + phases[i]) + 1) / 2;
          const gate = gates[i];
          const e =
            pulse > gate
              ? Math.pow((pulse - gate) / (1 - gate), 2.2)
              : 0;
          const level = Math.min(LEVELS - 1, (e * (LEVELS - 1)) | 0);
          const x = col * SPACING;

          const halo = haloColors[level];
          if (halo) {
            ctx!.fillStyle = halo;
            ctx!.beginPath();
            ctx!.arc(x, y, haloRadii[level], 0, Math.PI * 2);
            ctx!.fill();
          }

          const dimLevel = Math.min(
            DIM_LEVELS - 1,
            (pulse * (DIM_LEVELS - 1)) | 0
          );
          ctx!.fillStyle =
            halo !== null ? dotColors[level] : dimColors[dimLevel];
          ctx!.beginPath();
          ctx!.arc(x, y, RADIUS, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="dot-bg" aria-hidden>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
