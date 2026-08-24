'use client';

// Always mounted (see TaskManager.tsx) as a fixed, full-viewport layer sitting
// behind the app's content — so the drawing sticks around as a background
// when the user leaves doodle mode instead of unmounting with the canvas.
// Rendered as the first child so plain DOM order (not z-index) keeps it
// visually behind later content — negative z-index would technically paint
// it "further back," but Chromium's hit-testing then loses it to <body>
// entirely, breaking pointer input even with pointer-events: auto.
// `active` toggles whether it captures pointer input; the toolbar itself
// lives in the header (see DoodleToolbar), controlling this canvas via
// props/ref. The drawing is saved to localStorage so it also survives reloads.

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

const STROKE_WIDTH = 2.5;
const ERASER_WIDTH = 24;
const STORAGE_KEY = 'tm_doodle_drawing';

export interface DoodleCanvasHandle {
  clear: () => void;
}

interface DoodleCanvasProps {
  active: boolean;
  color: string;
  isErasing: boolean;
}

const DoodleCanvas = forwardRef<DoodleCanvasHandle, DoodleCanvasProps>(({ active, color, isErasing }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const saveDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      localStorage.setItem(STORAGE_KEY, canvas.toDataURL('image/png'));
    } catch {
      // Storage full or unavailable (private browsing) — drawing just won't persist.
    }
  }, []);

  // Size the canvas to the viewport, preserving whatever is already drawn across resizes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width === 0 || height === 0) return;

      const prev = document.createElement('canvas');
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext('2d')?.drawImage(canvas, 0, 0);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (prev.width && prev.height) {
        ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, width, height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Restore a previously saved doodle once, after the canvas above has its real size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!stored) return;

    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
    };
    img.src = stored;
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const point = getPoint(e);
    ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = isErasing ? ERASER_WIDTH : STROKE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    saveDrawing();
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  }), []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 touch-none"
      style={{ cursor: isErasing ? 'cell' : 'crosshair', pointerEvents: active ? 'auto' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
    />
  );
});

DoodleCanvas.displayName = 'DoodleCanvas';

export default DoodleCanvas;
