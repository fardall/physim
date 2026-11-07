# Q5 Potentiometer Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single self-contained `q5-potentiometer/index.html` that a teacher projects to show the 9702/21 Q5 circuit live: sliders for every variable, with moving current dots, a potential-coloured wire, a galvanometer needle and a Kirchhoff readout, all kept in sync.

**Architecture:** One HTML file with two inline scripts. `<script id="physics">` holds pure functions (`solve`, `snapXP`, `kirchhoffParts`, formatters) with no DOM access. `<script id="ui">` holds the SVG drawing, sliders, readouts and animation, and every render reads only from one `solve(state)` result. Node tests load the physics script out of `index.html` with `vm`, so the shipped file is exactly the tested code and no build step is needed.

**Tech Stack:** Plain HTML/CSS/JS (no libraries), inline SVG, `requestAnimationFrame`. Tests use Node ≥ 20 built-in `node:test` + `node:assert` (installed: v26.10.0).

**Spec:** `docs/superpowers/specs/2026-11-07-q5-potentiometer-sim-design.md`

## Global Constraints

- Single file `q5-potentiometer/index.html`, inline CSS + JS, works offline by double-click, no external libraries, no build step.
- Ideal (syllabus) potentiometer model: main circuit is never affected by the galvanometer branch. k is uniform along XY.
- Every displayed quantity comes from one `solve(state)` call per state change. No widget computes its own physics.
- Defaults (exam): E = 4.0 V, r = 0.35 Ω, R = 0.75 Ω, R_XY = 0.90 Ω, E_cell = 1.2 V, XP = 0.30 m, L = 0.45 m (fixed), branch on, electron view off.
- Slider ranges/steps: E 1.0–6.0 / 0.1; r 0–2.00 / 0.05; R 0–5.00 / 0.05; R_XY 0.10–3.00 / 0.05; E_cell 0.2–3.0 / 0.1; XP 0–L / 0.005.
- e = 1.60 × 10⁻¹⁹ C. Needle full scale |ΔV| = 0.05 V. Snap distance 0.0025 m.
- Readouts: p.d.s and currents to 2 d.p., E to 1 d.p. The Kirchhoff line's parts always sum exactly to the displayed E.
- Projector: high-contrast light theme, readouts ≥ 20px at 1366×768, thick strokes. Layout A: circuit about 75% on the left, controls about 25% on the right.
- Project is not a git repo. No commit steps. Do not run `git init` unless the user asks.

## Review Focus

1. **Exam defaults on load/reset must show BALANCED.** Float maths gives xpBal = 0.29999…, not 0.30. `solve` treats |XP − xpBal| < 1e-9 as balanced (Task 1 test `defaults are balanced`).
2. **Rounding that breaks the Kirchhoff sum.** E = 4.1 with the other values at default rounds naively to 0.72 + 1.54 + 1.85 = 4.11. It must show a sum of 4.10 (Task 1 test `kirchhoff parts sum exactly`).
3. **V_XY < E_cell (no balance point).** The message must show, the needle must pin at full scale, BALANCED must never light, and xpBal must be null (Task 1 test `no balance point`).
4. **Balance broken by another slider.** If P is balanced and the teacher then moves R, BALANCED must clear and the needle must move. Snap applies only when P itself moves (Task 1 test `balance clears when R changes`, Task 2 manual check).
5. **Dragging P past the wire ends, and r = 0 or R = 0.** XP clamps to [0, L]. r = R = 0 still gives finite values (Task 1 tests `clamps xp`, `zero r and R`).

---

### Task 1: Physics core + test harness

**Files:**
- Create: `q5-potentiometer/index.html` (minimal skeleton: `<!doctype html>`, `<title>Potentiometer — 9702 Q5</title>`, the `<script id="physics">` block only)
- Create: `q5-potentiometer/tests/physics.test.mjs`
- Create: `q5-potentiometer/tests/load-physics.mjs`

**Interfaces:**
- Produces (globals defined in `<script id="physics">`, plain `function`/`const`, no `export`):
  - `const L = 0.45`, `const E_CHARGE = 1.60e-19`, `const FULL_SCALE_DV = 0.05`, `const SNAP_DIST = 0.0025`
  - `const DEFAULTS = { E: 4.0, r: 0.35, R: 0.75, Rxy: 0.90, Ecell: 1.2, xp: 0.30, branch: true, electrons: false }`
  - `solve(state) -> { I, Vr, VR, Vxy, Vterm, k, Vxp, dV, xpBal /* number|null */, noBalance /* bool */, balanced /* bool */, needle /* -1..1 */, electronsPerSec, electrons45, kirchhoff /* {total:string, parts:[string,string,string]} */ }`
  - `snapXP(xp, state) -> number`: clamps to [0, L]. Returns exactly `solve(state).xpBal` if within `SNAP_DIST` of it.
  - `kirchhoffParts(E, terms /* number[] */) -> { total: string, parts: string[] }`: `total = E.toFixed(1)`, parts in 2 d.p., using the largest-remainder method in hundredths so the parts sum to `Math.round(E*100)`.
  - `fmtSci(x, sf) -> string`, e.g. `fmtSci(1.25e19, 3) === "1.25 × 10¹⁹"` (Unicode superscripts).
- `tests/load-physics.mjs` exports `loadPhysics() -> object` (the vm context with the globals above). It reads `../index.html`, extracts the text of `<script id="physics">` by regex, and runs it in `vm.createContext({})`.

Rules for `solve` (spec "Physics model"):
- `I = E/(r+R+Rxy)`, `Vr=I*r`, `VR=I*R`, `Vxy=I*Rxy`, `Vterm=E-Vr`, `k=Vxy/L`, `Vxp=k*xp`.
- `xpBal = Ecell/k` if `xpBal <= L`, else `null` and `noBalance = true`.
- `balanced = branch && xpBal !== null && Math.abs(xp - xpBal) < 1e-9`. When balanced, `dV = 0`, otherwise `dV = Vxp - Ecell`.
- `needle = clamp(dV / FULL_SCALE_DV, -1, 1)`, and `0` when branch is off.
- `electronsPerSec = I/E_CHARGE`, `electrons45 = 45*electronsPerSec`.
- `kirchhoff = kirchhoffParts(E, [Vr, VR, Vxy])`.

- [ ] **Step 1: Write the failing tests** in `tests/physics.test.mjs`

```js
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
  assert.deepEqual(P.solve(S()).kirchhoff, { total: '4.0', parts: ['0.70', '1.50', '1.80'] });
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
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `cd q5-potentiometer && node --test tests/`
Expected: FAIL (index.html missing, or `solve is not a function`).

- [ ] **Step 3: Create `index.html` skeleton and `load-physics.mjs`, then implement the physics globals** following the Interfaces and rules above.

- [ ] **Step 4: Run tests and confirm they pass**

Run: `cd q5-potentiometer && node --test tests/`
Expected: all 12 tests pass.

---

### Task 2: Layout A, circuit drawing, sliders, readouts (static, synced)

**Files:**
- Modify: `q5-potentiometer/index.html` (add `<style>`, markup, `<script id="ui">` after the physics script)

**Interfaces:**
- Consumes: `DEFAULTS`, `L`, `solve`, `snapXP`, `fmtSci` from Task 1.
- Produces (in `<script id="ui">`): `let state` (copy of `DEFAULTS`), `let result` (last `solve(state)`), `setState(patch, {fromP})`, `render()`. `setState` merges the patch. If `fromP` is set, it runs `state.xp = snapXP(state.xp, state)`. It then sets `result = solve(state)` and calls `render()`. This is the **only** place `solve` is called. Task 3 uses `state`, `result`, `setState`, and SVG element ids `wire-xy`, `contact-p`, `needle`, and path ids `path-main`, `path-branch` (drawn in conventional-current direction).

Requirements:
- **Grid:** two columns, about 75% / 25%. Columns stack only below 900px wide. Body has an explicit background. Use a light high-contrast palette defined as `:root` CSS variables.
- **SVG circuit** (`viewBox` fixed, scales to column), matching Fig. 5.2 (spec "Layout"):
  - Top: battery as a multi-cell symbol with the long plate (+) toward the X side, and r in a dashed box. Labels `E = 4.0 V`, `r = 0.35 Ω` update from state.
  - Right: R.
  - Bottom: thick wire XY with X on the left and Y on the right. Label `L = 0.45 m`.
  - Branch from X down to the cell (+ toward X), then G (circle with `needle` line pivoting at bottom centre), then a lead up to contact P at x-position proportional to `xp/L`.
  - Branch group `id="branch"` is hidden when `state.branch` is false.
- **Controls column:** six range inputs with live value labels (ranges/steps from Global Constraints), checkboxes "Show potentiometer branch" and "Show electron flow", and a "Reset to exam values" button that calls `setState({...DEFAULTS}, {fromP:true})`.
- **Readouts, all from `result`:**
  - I, V_r, V_R, V_XY, terminal p.d., k (2 d.p.).
  - When the branch is on: `V_XP` and `cell`, plus a BALANCED badge when `result.balanced`.
  - XP_bal (3 d.p., m), or when `noBalance` the exact message: `No balance point: p.d. across XY (x.xx V) is less than cell e.m.f. (y.yy V)`.
  - Electrons per second and electrons in 45 s via `fmtSci(...,3)` and `fmtSci(...,2)`.
  - Kirchhoff line rendered as `E = Ir + IR + I·R_XY` above `${total} V = ${parts[0]} V + ${parts[1]} V + ${parts[2]} V`.
- **Needle:** in this task, set its rotation directly from `result.needle` (±45° at full scale). Task 3 adds easing.

- [ ] **Step 1: Build markup, styles and `setState`/`render`.**
- [ ] **Step 2: Re-run physics tests** with `cd q5-potentiometer && node --test tests/`. Expected: all pass (the UI script must not break extraction).
- [ ] **Step 3: Manual check in a browser at 1366×768.** Open `q5-potentiometer/index.html` and confirm:
  - On load: I = 2.00 A, V_XY = 1.80 V, k = 4.00 V m⁻¹, XP_bal = 0.300 m, BALANCED shown, needle centred, `4.0 V = 0.70 V + 1.50 V + 1.80 V`, 1.25 × 10¹⁹ and 5.6 × 10²⁰.
  - Set E = 4.1: Kirchhoff parts still sum to 4.10.
  - Move R: BALANCED clears and the needle deflects.
  - Set E_cell = 2.0: the no-balance message shows and the needle pins.
  - Untick branch: the branch disappears and the needle readouts hide.
  - Reset restores everything.

---

### Task 3: Live visuals: current dots, wire potential colour, needle easing, drag P

**Files:**
- Modify: `q5-potentiometer/index.html` (`<script id="ui">` and styles)

**Interfaces:**
- Consumes: `state`, `result`, `setState`, ids `wire-xy`, `contact-p`, `needle`, `path-main`, `path-branch` from Task 2.

Requirements (spec "Visuals"):
- **Current dots:** evenly spaced circles along `path-main` (use `getTotalLength`/`getPointAtLength`), moved each `requestAnimationFrame`.
  - Speed is a monotonic function of `result.I`, with a floor so 0.2 A still visibly creeps and a cap so 6 A+ stays watchable.
  - With electron view on, dots use a different colour and move in reverse.
  - No dots on `path-branch` (ideal model).
- **Wire colour:** linear gradient on `wire-xy` from a "high potential" colour at X to "low" at Y, plus a small legend `high V → low V`. It is uniform, because k is uniform. Optionally show a marker at P with `V_XP` from `result.Vxp`.
- **Needle:** each frame, ease the displayed angle toward `result.needle × 45°` with time constant ≤ 200 ms total settle. When `result.needle === 0`, the target is exactly 0.
- **Drag P:** pointer events on `contact-p` (and the wire). Map pointer x to `xp ∈ [0, L]` and call `setState({xp}, {fromP:true})`. The XP slider reflects the new value, and moving the slider moves P. Use `touch-action: none` and pointer capture.
- **Pause animation when the tab is hidden:** `requestAnimationFrame` already does this. Do not add timers.

- [ ] **Step 1: Implement dots, gradient, needle easing, drag.**
- [ ] **Step 2: Re-run physics tests** with `cd q5-potentiometer && node --test tests/`. Expected: all pass.
- [ ] **Step 3: Manual sync check at 1366×768:**
  - Drag P slowly across the whole wire. The needle passes through zero exactly when BALANCED lights and XP reads 0.300 m. P cannot leave the wire.
  - Raise E: the dots speed up. Toggle electron view: the dots reverse and change colour.
  - Drag every slider from end to end. Confirm that no readout, needle, label or dot speed disagrees, and there is no console error.
  - Check that it runs smoothly with DevTools performance throttling ×4.

---

## Done when

- `node --test q5-potentiometer/tests/` passes.
- All manual checks in Tasks 2 and 3 pass.
- `index.html` opens offline by double-click and has no network requests (DevTools Network tab is empty apart from the file itself).
