import { useEffect, useRef, useState } from 'react';
import { LOOP_MS, createState, drawConfetti, stepConfetti } from './confetti.js';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function PackageIcon() {
  return (
    <svg className="badge-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.4 4.9 8 2.2l5.6 2.7v5.7L8 13.4 2.4 10.6V4.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 7.7 2.6 5.1M8 7.7l5.4-2.6M8 7.7v5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pointer() {
  return (
    <svg className="pointer" viewBox="0 0 26 30" aria-hidden="true">
      <path
        d="M1.2 1.1 1.4 23.6 8.1 17.2 12.7 27.6 16.8 25.7 12.1 15.2 20.8 14.7Z"
        fill="#111111"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NpmMark() {
  return (
    <svg className="npm-mark" viewBox="0 0 24 24" role="img" aria-label="npm">
      <path
        fill="#CB3837"
        fillRule="evenodd"
        d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.665V8.667h5.334v5.332h-1.333v1.332h-2zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"
      />
    </svg>
  );
}

function cursorPoint(elapsed) {
  const count = document.querySelector('.count');
  if (!count) return null;
  const rect = count.getBoundingClientRect();
  const drift = elapsed / LOOP_MS;
  const distance = Math.min(window.innerWidth * 0.2, 300);
  return {
    x: rect.left + rect.width * 0.7 + drift * distance,
    y: rect.top + rect.height * 0.62 + drift * 34,
  };
}

export function Celebration() {
  const reduced = useReducedMotion();
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const place = (elapsed) => {
      const point = cursorPoint(reduced ? 0 : elapsed);
      if (!point || !cursor) return;
      cursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
      cursor.style.opacity = '1';
    };

    if (reduced) {
      place(0);
      const onResize = () => place(0);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = createState();
    let frame = 0;
    const started = performance.now();

    const tick = (now) => {
      const elapsed = (now - started) % LOOP_MS;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      const count = document.querySelector('.count');
      const rect = count?.getBoundingClientRect();
      const origin = rect && rect.width > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
      stepConfetti(state, elapsed, origin, { width, height });
      drawConfetti(ctx, state, width, height, dpr);
      place(elapsed);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  return (
    <div className={reduced ? 'scene scene--still' : 'scene'}>
      <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
      <main className="stack">
        <div className="badge">
          <PackageIcon />
          <span>@hugeicons/react</span>
        </div>
        <h1 className="count">886K</h1>
        <p className="label">Weekly Downloads</p>
        <p className="thanks">Thank you for the support 💚</p>
      </main>
      <div className="npm">
        <NpmMark />
      </div>
      <div ref={cursorRef} className="cursor" aria-hidden="true">
        <Pointer />
      </div>
    </div>
  );
}
