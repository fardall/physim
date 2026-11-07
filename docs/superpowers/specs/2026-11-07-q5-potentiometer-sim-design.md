# Q5 Potentiometer Simulation — Design

Source: `9702_s21_qp_21.md`, Question 5 (Cambridge 9702/21, May/June 2021).

## Intent

Students struggle to picture circuit theory (Kirchhoff's second law, potential falling along a wire, the potentiometer null point) from static textbook diagrams. This is a live, interactive version of the Fig. 5.1 / Fig. 5.2 circuit that the teacher projects in class and drives while explaining. Every variable is a slider; everything on screen reacts instantly.

## Users and setting

- One teacher, projecting to a classroom, operating it with mouse/trackpad while talking.
- Students watch; they do not operate it.
- Must be readable from the back of a room: large text, thick lines, high contrast.

## Goals

1. Show the Fig. 5.2 circuit as a large, clear, animated diagram.
2. Let the teacher change every variable live and see consequences immediately.
3. Make invisible quantities visible: current (moving dots), potential along XY (colour gradient), galvanometer current (needle).
4. Open at the exam values so the teacher can tie it straight back to the paper.

## Non-goals

- No step-by-step walkthrough of 5(a), 5(b), 5(c). One free-play circuit only (teacher's decision).
- No student accounts, quizzes, scoring, or saving.
- No other questions from the paper.
- No circuit editor (topology is fixed).

## Anti-goal (most important)

**Values out of sync.** If any readout, the needle, the dot speed, the colour gradient, or the Kirchhoff sum disagrees with any other, even briefly or by rounding, the sim is a failure in front of the class. All displayed quantities must come from one physics solve per state change; nothing is computed separately per widget.

## Layout (teacher chose layout A)

- Left ~75% width: circuit diagram (SVG), drawn to match Fig. 5.2:
  - Top: battery (multi-cell symbol) and internal resistance r inside a dashed box.
  - Right side: fixed resistor R.
  - Bottom: thick uniform resistance wire from Y (right) to X (left), labelled X and Y.
  - Below the wire: branch from X down to the 1.2 V cell, then galvanometer G (circle with needle), then a flexible lead up to sliding contact P on XY.
  - Polarity: battery + and cell + both face the X side (like terminals meet at X), as in the paper.
- Right ~25%: stacked sliders, then readouts, then buttons.
- Fixed 16:9-friendly layout; must also work when the browser window is not full-screen. Phone layout not required.

## Controls

| Control | Default (exam) | Range | Step |
|---|---|---|---|
| Battery e.m.f. E | 4.0 V | 1.0 – 6.0 V | 0.1 |
| Internal resistance r | 0.35 Ω | 0 – 2.00 Ω | 0.05 |
| Fixed resistor R | 0.75 Ω | 0 – 5.00 Ω | 0.05 |
| Wire resistance R_XY | 0.90 Ω | 0.10 – 3.00 Ω | 0.05 |
| Cell e.m.f. E_cell | 1.2 V | 0.2 – 3.0 V | 0.1 |
| Contact position XP | 0.30 m | 0 – L | 0.005 m |

- Wire length L is fixed at 0.45 m (the answer to 5c(i)), labelled on the diagram.
- XP is set by its slider and also by dragging P directly along the wire. Both stay in sync.
- Toggle: **Show potentiometer branch** (on/off). Off = Fig. 5.1 (plain series loop, no cell/G); on = Fig. 5.2.
- Toggle: **Show electron flow** (off = conventional current dots, + to −; on = electrons moving opposite way, different colour).
- Button: **Reset to exam values**.

Default R = 0.75 Ω is derived: I = V_XY / R_XY = 1.8 / 0.90 = 2.0 A; E = I(r + R + R_XY) gives 4.0 = 2.0(0.35 + R + 0.90), so R = 0.75 Ω (answer to 5b(iii)).

## Physics model (single source of truth)

One function `solve(state)` returns every displayed quantity. Called on every input change. Rendering only reads its output.

Branch off (Fig. 5.1):
- I = E / (r + R + R_XY)
- V_XY = I·R_XY, V_r = I·r, V_R = I·R, terminal p.d. = E − I·r
- Potential gradient k = V_XY / L (V m⁻¹)

Branch on (Fig. 5.2): **ideal, syllabus-level potentiometer model** (teacher's decision: cover only the syllabus case). The galvanometer branch is treated as drawing negligible current from the main circuit, so the main circuit is always the branch-off solve above. The wire's potential gradient k is uniform along the whole of XY and does not change as P moves.
- V_XP = k·XP.
- Galvanometer signal: ΔV = V_XP − E_cell. Needle deflection ∝ ΔV (signed, clamped at full scale), zero exactly at balance. The needle shows *direction and size of imbalance*; no galvanometer current in mA is displayed.
- This is one consistent model, and every widget reads from it, so nothing can disagree.

Exam defaults must reproduce: I = 2.0 A, V_XY = 1.8 V, k = 4.0 V m⁻¹, balance at XP = 0.30 m, electrons per second = I/e = 1.25 × 10¹⁹ s⁻¹ (5.6 × 10²⁰ in 45 s, answer to 5b(ii)).

Balance point XP_bal = E_cell / k. It stays fixed while P is dragged.

Snap: when P is dragged or slid within half a step (0.0025 m) of XP_bal, P snaps to exactly XP_bal. Then ΔV = 0 really holds, so the needle, BALANCED indicator and readouts agree without a tolerance fudge. (My call, to resolve slider-step granularity.)

No balance point possible: if V_XY < E_cell, show a clear message ("No balance point: p.d. across XY (x.xx V) is less than cell e.m.f. (y.yy V)"). The needle never reaches zero anywhere along the wire. This is a teaching moment, not an error.

## Readouts (all from `solve`)

- Current I (A)
- p.d. across XY, across R, across r; terminal p.d.
- Potential gradient along XY (V m⁻¹)
- p.d. across XP
- When branch on: `V_XP = x.xx V` beside `cell = y.y V`, plus a "BALANCED" indicator when ΔV = 0 (P at XP_bal)
- Balance length XP_bal = E_cell / k (m), or the "no balance point" message
- Electrons per second through the battery (I/e), and electrons in 45 s
- **Kirchhoff's second law line**, live, always 3 terms: `E = Ir + IR + I·R_XY`, e.g. `4.0 V = 0.70 V + 1.50 V + 1.80 V`. Unaffected by the branch (ideal model).

Formatting (my call): p.d.s and currents to 2 decimal places, E to 1 d.p. as on its slider. The total on the Kirchhoff line is always the slider value of E. If the rounded parts don't sum to it, adjust the part with the largest rounding remainder by 0.01 (largest-remainder method), so the visible sum is always exact. Products (displayed I × displayed R vs displayed V) are not required to match to the last digit.

## Visuals

- Current dots move along every conductor at speed ∝ that segment's current (capped so they stay watchable; floor so a tiny current still visibly creeps). No dots in the galvanometer branch (ideal model: negligible current there).
- Wire XY coloured by potential (gradient from high at X to low at Y), with a small legend. Optional marker at P showing potential relative to X.
- Galvanometer: needle swings smoothly to its new position (short ease, < 200 ms) so the live feel is kept without lagging behind the numbers.
- Labels on diagram: E, r, R, R_XY, X, Y, P, L = 0.45 m, E_cell, G.

## Constraints

- Single self-contained `index.html` (inline CSS + JS). Opens by double-clicking, works offline, no install, no build step, no external libraries. (My call; the teacher didn't specify.)
- Must run smoothly on a typical school laptop.
- Projector-friendly: large fonts (readouts ≥ 20px on a 1366×768 screen), thick strokes, high-contrast light theme.

## Left to builder / my calls (teacher hasn't confirmed)

- Branch toggle default: **on** (Fig. 5.2) is my call; the teacher can switch it off to start from Fig. 5.1.
- Galvanometer full-scale: |ΔV| = 0.05 V (my call). One 0.005 m step off balance at exam values gives 0.02 V, which is 40% deflection and clearly visible. Larger misses clamp at full scale.
- Snap-to-balance and the rounding rule: my calls (see above).
- No dots in the galvanometer branch: my call, follows from the ideal model.
- Colours, fonts, exact dot spacing and speeds: builder's call within the projector constraints.
- File location: `physim/q5-potentiometer/index.html`, my call.

## Testing

- The `solve` function is pure and tested against exam values (above) and against Kirchhoff checks for random states: the loop p.d.s sum to E, V_XP = k·XP, and XP_bal = E_cell / k.
- Manual check on a projector-sized window: drag every slider end to end and confirm that no readout, needle, or animation disagrees.
