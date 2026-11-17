export const LOOP_MS = 7000;
const RAIN_START = 0;
const RAIN_END = 3000;
const CLEAR_AT = 5850;

const COLORS = [
  '#E23B3B',
  '#EF4444',
  '#DC2626',
  '#22C55E',
  '#16A34A',
  '#4ADE80',
  '#FACC15',
  '#F5B301',
  '#FDE047',
  '#EC4899',
  '#F472B6',
  '#FB7185',
  '#14B8A6',
  '#2DD4BF',
  '#06B6D4',
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paper(rand, kind) {
  const wide = rand() < 0.55;
  const length = 5 + rand() * 8;
  return {
    nx: rand(),
    ny: kind === 'sheet' ? -0.04 + rand() * 0.92 : -0.08 - rand() * 0.18,
    vx: (rand() - 0.5) * 28,
    vy: 70 + rand() * 150,
    gravity: 70 + rand() * 90,
    life: 2.15 + rand() * 1.35,
    w: wide ? length : length * 0.42,
    h: wide ? length * (0.28 + rand() * 0.22) : length,
    rot: rand() * Math.PI,
    vr: (rand() - 0.5) * 1.6,
    color: COLORS[(rand() * COLORS.length) | 0],
    sway: 8 + rand() * 18,
    swayFreq: 0.7 + rand() * 1.3,
    swayPhase: rand() * Math.PI * 2,
  };
}

export function createShow() {
  const rand = mulberry32(0x886001);
  const pieces = [];
  for (let i = 0; i < 560; i += 1) pieces.push({ t: RAIN_START, ...paper(rand, 'sheet') });
  let acc = 0;
  for (let t = RAIN_START; t < RAIN_END; t += 16) {
    const u = (t - RAIN_START) / (RAIN_END - RAIN_START);
    const rate = 320 + 980 * u ** 0.7;
    acc += rate * 0.016;
    while (acc >= 1) {
      const spec = paper(rand, 'rain');
      spec.life = Math.min(spec.life, Math.max(0.7, (CLEAR_AT - 100 - t) / 1000));
      pieces.push({ t, ...spec });
      acc -= 1;
    }
  }
  return pieces;
}

export function createState() {
  return {
    particles: [],
    index: 0,
    lastElapsed: 0,
    show: createShow(),
  };
}

function emit(state, spec, viewport, bornMs) {
  state.particles.push({
    x: spec.nx * viewport.width,
    y: spec.ny * viewport.height,
    vx: spec.vx,
    vy: spec.vy,
    gravity: spec.gravity,
    life: spec.life,
    born: bornMs / 1000,
    age: 0,
    w: spec.w,
    h: spec.h,
    rot: spec.rot,
    vr: spec.vr,
    color: spec.color,
    sway: spec.sway,
    swayFreq: spec.swayFreq,
    swayPhase: spec.swayPhase,
    alpha: 1,
  });
}

export function stepConfetti(state, elapsed, _origin, viewport) {
  if (elapsed + 40 < state.lastElapsed) {
    state.particles.length = 0;
    state.index = 0;
  }
  const dt = Math.min(0.034, Math.max(0, (elapsed - state.lastElapsed) / 1000));
  state.lastElapsed = elapsed;

  const show = state.show;
  while (state.index < show.length && show[state.index].t <= elapsed) {
    emit(state, show[state.index], viewport, show[state.index].t);
    state.index += 1;
  }

  const now = elapsed / 1000;
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.age = now - p.born;
    if (p.age >= p.life || elapsed >= CLEAR_AT) {
      state.particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt + Math.sin(p.age * p.swayFreq + p.swayPhase) * p.sway * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const fadeWindow = 0.45;
    p.alpha = p.age > p.life - fadeWindow ? Math.max(0, (p.life - p.age) / fadeWindow) : 1;
    if (p.y > viewport.height + 30 || p.x < -40 || p.x > viewport.width + 40) {
      state.particles.splice(i, 1);
    }
  }
}

export function drawConfetti(ctx, state, width, height, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  for (const p of state.particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
