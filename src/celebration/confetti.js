export const LOOP_MS = 7000;
const BURST_AT = 1000;
const RAIN_END = 4000;

const COLORS = [
  '#E23B3B',
  '#F5B301',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#F43F5E',
  '#84CC16',
  '#06B6D4',
  '#FACC15',
  '#FB7185',
  '#CB3837',
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

function visual(rand, burst) {
  const roll = rand();
  const shape = roll < 0.58 ? 'rect' : roll < 0.82 ? 'strip' : 'circle';
  const size = (burst ? 9 : 7) + rand() * (burst ? 11 : 8);
  return {
    shape,
    w: shape === 'strip' ? size * 0.42 : size * (shape === 'circle' ? 0.72 : 0.85),
    h: shape === 'strip' ? size * 1.85 : shape === 'circle' ? size * 0.72 : size * (0.5 + rand() * 0.55),
    rot: rand() * Math.PI * 2,
    vr: (rand() - 0.5) * (burst ? 11 : 7),
    color: COLORS[(rand() * COLORS.length) | 0],
    sway: 10 + rand() * 26,
    swayFreq: 1.4 + rand() * 2.2,
    swayPhase: rand() * Math.PI * 2,
  };
}

function burstSpec(rand) {
  const cone = rand() < 0.8;
  const angle = cone ? -Math.PI * 0.5 + (rand() - 0.5) * Math.PI * 1.45 : rand() * Math.PI * 2;
  const speed = cone ? 420 + rand() * 900 : 180 + rand() * 520;
  return {
    ox: (rand() - 0.5) * 18,
    oy: (rand() - 0.5) * 12,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    gravity: 1180 + rand() * 360,
    life: 1.7 + rand() * 1.15,
    ...visual(rand, true),
  };
}

function rainSpec(rand, u) {
  const slow = rand() < 0.5 + u * 0.28;
  return {
    ox: (rand() - 0.5) * (170 + u * 150),
    oy: -16 - rand() * 70,
    vx: (rand() - 0.5) * 80,
    vy: slow ? -8 + rand() * 36 : 12 + rand() * 100,
    gravity: slow ? 62 + rand() * 48 : 150 + rand() * 70,
    life: slow ? 3.1 + rand() * 1.5 : 2.15 + rand() * 0.9,
    ...visual(rand, false),
  };
}

export function createShow() {
  const rand = mulberry32(0x886001);
  const burst = Array.from({ length: 150 }, () => burstSpec(rand));
  const rain = [];
  let acc = 0;
  for (let t = BURST_AT; t < RAIN_END; t += 16) {
    const u = (t - BURST_AT) / (RAIN_END - BURST_AT);
    const rate = 96 * (1 - u) ** 1.55 + 10;
    acc += rate * 0.016;
    while (acc >= 1) {
      const spec = rainSpec(rand, u);
      const maxLife = Math.max(0.8, (6750 - t) / 1000);
      spec.life = Math.min(spec.life, maxLife);
      rain.push({ t, ...spec });
      acc -= 1;
    }
  }
  return { burst, rain };
}

export function createState() {
  return {
    particles: [],
    burstDone: false,
    rainIndex: 0,
    lastElapsed: 0,
    show: createShow(),
  };
}

function emit(state, spec, origin, bornMs) {
  state.particles.push({
    x: origin.x + spec.ox,
    y: origin.y + spec.oy,
    vx: spec.vx,
    vy: spec.vy,
    gravity: spec.gravity,
    life: spec.life,
    born: bornMs / 1000,
    age: 0,
    shape: spec.shape,
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

export function stepConfetti(state, elapsed, origin, viewport) {
  if (elapsed + 40 < state.lastElapsed) {
    state.particles.length = 0;
    state.burstDone = false;
    state.rainIndex = 0;
  }
  const dt = Math.min(0.034, Math.max(0, (elapsed - state.lastElapsed) / 1000));
  state.lastElapsed = elapsed;

  if (origin && !state.burstDone && elapsed >= BURST_AT) {
    for (const spec of state.show.burst) emit(state, spec, origin, BURST_AT);
    state.burstDone = true;
  }

  if (origin) {
    const rain = state.show.rain;
    while (state.rainIndex < rain.length && rain[state.rainIndex].t <= elapsed) {
      emit(state, rain[state.rainIndex], origin, rain[state.rainIndex].t);
      state.rainIndex += 1;
    }
  }

  const now = elapsed / 1000;
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.age = now - p.born;
    if (p.age >= p.life || elapsed >= 6900) {
      state.particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.vx *= Math.exp(-0.7 * dt);
    p.x += p.vx * dt + Math.sin(p.age * p.swayFreq + p.swayPhase) * p.sway * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const fadeWindow = 0.5;
    p.alpha = p.age > p.life - fadeWindow ? Math.max(0, (p.life - p.age) / fadeWindow) : 1;
    if (p.y > viewport.height + 48 || p.x < -80 || p.x > viewport.width + 80) {
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
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 1.4);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
