import { BufferGeometry, BufferAttribute } from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

// ---- SDF primitives (iq) ----
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
function smin(a, b, k) {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}
function smax(a, b, k) { return -smin(-a, -b, k); }
function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx, qy = Math.abs(py) - by, qz = Math.abs(pz) - bz;
  const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
  return Math.hypot(mx, my, mz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
}
function sdSphere(px, py, pz, cx, cy, cz, r) { return Math.hypot(px - cx, py - cy, pz - cz) - r; }
function sdEllipsoid(px, py, pz, rx, ry, rz) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k0 * (k0 - 1) / k1;
}
// round cone between a(r1) and b(r2)
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const xx = (pax * l2 - bax * y), xy = (pay * l2 - bay * y), xz = (paz * l2 - baz * y);
  const x2 = xx * xx + xy * xy + xz * xz;
  const y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

function root(px, py, pz, s) {
  // two-segment slightly curved root, flattened along z
  const z = pz * 1.35;
  const a = [0.38 * s, 0.32, 0.02], m = [0.56 * s, -0.55, 0.0], b = [0.66 * s, -1.42, -0.08];
  const d1 = sdRoundCone(px, py, z, a, m, 0.42, 0.26);
  const d2 = sdRoundCone(px, py, z, m, b, 0.26, 0.08);
  return smin(d1, d2, 0.12);
}

export function toothSDF(x, y, z) {
  // crown body
  let d = sdRoundBox(x, y - 0.70, z, 0.50, 0.14, 0.40, 0.46);
  // subtle equatorial bulge
  d = smin(d, sdEllipsoid(x, y - 0.62, z, 1.04, 0.46, 0.92), 0.15);
  // cusps
  const cy = 1.08;
  for (const [cx, cz] of [[0.44, 0.36], [-0.42, 0.35], [0.46, -0.34], [-0.43, -0.37]]) {
    d = smin(d, sdSphere(x, y, z, cx, cy, cz, 0.36), 0.16);
  }
  // occlusal fossa + fissures
  d = smax(d, -sdEllipsoid(x, y - 1.46, z, 0.36, 0.34, 0.32), 0.1);
  d = smax(d, -sdEllipsoid(x, y - 1.36, z, 0.8, 0.16, 0.07), 0.06);
  d = smax(d, -sdEllipsoid(x, y - 1.36, z, 0.07, 0.16, 0.66), 0.06);
  // cervical narrowing (neck)
  const neck = sdEllipsoid(x, y - 0.18, z, 0.78, 0.35, 0.62);
  // roots
  const r = smin(root(x, y, z, 1), root(x, y, z, -1), 0.06);
  const lower = smin(neck, r, 0.25);
  d = smin(d, lower, 0.32);
  return d;
}

/** Build a smooth tooth BufferGeometry via marching cubes over the SDF. */
export function buildToothGeometry(resolution = 84) {
  const mc = new MarchingCubes(resolution, { flatShading: false }, false, false, 120000);
  mc.isolation = 0;
  const S = 1.95;       // world half-extent sampled
  const yOff = -0.05;   // vertical centering
  const n = mc.size, field = mc.field;
  for (let k = 0; k < n; k++) {
    const fz = (k - mc.halfsize) / mc.halfsize;
    for (let j = 0; j < n; j++) {
      const fy = (j - mc.halfsize) / mc.halfsize;
      for (let i = 0; i < n; i++) {
        const fx = (i - mc.halfsize) / mc.halfsize;
        field[i + j * n + k * n * n] = -toothSDF(fx * S, fy * S - yOff, fz * S) * 10;
      }
    }
  }
  mc.update();
  const count = mc.count;
  const pos = mc.geometry.getAttribute('position').array.slice(0, count * 3);
  const nor = mc.geometry.getAttribute('normal').array.slice(0, count * 3);
  for (let i = 0; i < pos.length; i++) pos[i] *= S;
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.translate(0, -0.05, 0);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  mc.geometry.dispose();
  return g;
}
