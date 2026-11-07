import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPhysics } from './load-physics.mjs';
const P = loadPhysics();
const S = (o = {}) => ({ ...P.DEFAULTS, ...o });
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('exam values', () => {
  const s = P.solve(S());
  near(s.I, 2.0); near(s.Vxy, 1.8); near(s.k, 4.0); near(s.xpBal, 0.30);
  near(s.electronsPerSec, 1.25e19, 1e10); near(s.electrons45, 5.625e20, 1e12);
});
test('defaults are balanced', () => {
  const s = P.solve(S());
  assert.equal(s.balanced, true); assert.equal(s.dV, 0); assert.equal(s.needle, 0);
});
test('kirchhoff exam line', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(P.solve(S()).kirchhoff)), { total: '4.0', parts: ['0.70', '1.50', '1.80'] });
});
test('kirchhoff parts sum exactly', () => {
  for (const E of [1.0, 2.3, 4.1, 5.7, 6.0]) for (const r of [0, 0.35, 1.15]) for (const R of [0, 0.75, 3.3]) {
    const k = P.solve(S({ E, r, R })).kirchhoff;
    const sum = k.parts.reduce((a, p) => a + Math.round(+p * 100), 0);
    assert.equal(sum, Math.round(E * 100), `E=${E} r=${r} R=${R} ${k.parts}`);
  }
});
test('no balance point', () => {
  const s = P.solve(S({ Ecell: 2.0 }));          // Vxy = 1.8 < 2.0
  assert.equal(s.noBalance, true); assert.equal(s.xpBal, null);
  assert.equal(s.balanced, false); assert.equal(s.needle, -1);
});
test('off balance needle sign and clamp', () => {
  near(P.solve(S({ xp: 0.305 })).needle, 0.4, 1e-9);   // dV = +0.02
  assert.equal(P.solve(S({ xp: 0.45 })).needle, 1);
  assert.equal(P.solve(S({ xp: 0 })).needle, -1);
});
test('balance clears when R changes', () => {
  const s = P.solve(S({ R: 1.0 }));
  assert.equal(s.balanced, false); assert.notEqual(s.needle, 0);
});
test('branch off: needle 0, not balanced', () => {
  const s = P.solve(S({ branch: false }));
  assert.equal(s.needle, 0); assert.equal(s.balanced, false);
});
test('snap and clamp xp', () => {
  const st = S({ R: 1.0 });
  const bal = P.solve(st).xpBal;
  assert.equal(P.snapXP(bal + 0.002, st), bal);
  assert.equal(P.snapXP(bal + 0.004, st), bal + 0.004);
  assert.equal(P.snapXP(-0.1, st), 0);
  assert.equal(P.snapXP(0.9, st), P.L);
});
test('zero r and R', () => {
  const s = P.solve(S({ r: 0, R: 0 }));
  assert.ok(Number.isFinite(s.I)); near(s.Vxy, 4.0);
});
test('kirchhoff holds for random states', () => {
  for (let i = 0; i < 500; i++) {
    const st = S({ E: 1 + Math.random() * 5, r: Math.random() * 2, R: Math.random() * 5, Rxy: 0.1 + Math.random() * 2.9 });
    const s = P.solve(st);
    near(s.Vr + s.VR + s.Vxy, st.E, 1e-9); near(s.Vxp, s.k * st.xp, 1e-12);
  }
});
test('fmtSci', () => {
  assert.equal(P.fmtSci(1.25e19, 3), '1.25 × 10¹⁹');
  assert.equal(P.fmtSci(5.625e20, 2), '5.6 × 10²⁰');
});
test('internal resistance off: r ignored, ideal battery', () => {
  const s = P.solve(S({ internal: false }));       // r = 0.35 on slider, but excluded
  near(s.I, 4.0 / (0.75 + 0.90)); near(s.Vr, 0); near(s.Vterm, 4.0);
  const k = JSON.parse(JSON.stringify(s.kirchhoff));
  assert.equal(k.parts.length, 2);
  assert.equal(k.parts.reduce((a, p) => a + Math.round(+p * 100), 0), 400);
});
test('internal resistance on by default', () => {
  assert.equal(P.DEFAULTS.internal, true);
  assert.equal(JSON.parse(JSON.stringify(P.solve(S()).kirchhoff)).parts.length, 3);
});
