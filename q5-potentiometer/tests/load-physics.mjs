import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Runs the exact <script id="physics"> shipped in index.html, so tests cover the real code.
export function loadPhysics() {
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  const m = html.match(/<script id="physics">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('physics script not found in index.html');
  const ctx = vm.createContext({});
  // Top-level const/let are not context properties; export them explicitly.
  vm.runInContext(m[1] + '\n;Object.assign(globalThis, { L, E_CHARGE, FULL_SCALE_DV, SNAP_DIST, DEFAULTS });', ctx);
  return ctx;
}
