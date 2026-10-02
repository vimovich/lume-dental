// Precompute tooth mesh → compact binary (quantized positions + uint16 indices)
import { buildToothGeometry } from '../src/js/tooth-geometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { writeFileSync } from 'node:fs';
const g0 = buildToothGeometry(92);
g0.deleteAttribute('normal');
const g = mergeVertices(g0, 1e-4);
const pos = g.getAttribute('position').array;
const idx = g.getIndex().array;
const vcount = pos.length / 3;
const SCALE = 2.0; // positions within [-2,2]
const q = new Int16Array(pos.length);
for (let i = 0; i < pos.length; i++) q[i] = Math.round((pos[i] / SCALE) * 32767);
const header = new Uint32Array([vcount, idx.length]);
const ind = vcount < 65536 ? new Uint16Array(idx) : new Uint32Array(idx);
const buf = Buffer.concat([Buffer.from(header.buffer), Buffer.from(q.buffer), Buffer.from(ind.buffer)]);
writeFileSync(new URL('../public/assets/tooth.bin', import.meta.url), buf);
console.log('verts', vcount, 'tris', idx.length / 3, 'bytes', buf.length, 'u16', vcount < 65536);
