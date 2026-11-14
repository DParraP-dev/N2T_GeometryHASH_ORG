// Smoke tests for Hack Dash on the official nand2tetris VM.
// Run with:  npm test      (needs the simulator, see tools/README.md)

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadSimulator, compileFolder } from "../tools/lib/n2t.mjs";
import { run } from "../tools/sim.mjs";

const PROGRAM = fileURLToPath(new URL("../HackDash", import.meta.url));

// Free heap once the game is running (the title screen allocates and frees
// its own objects before that, so early samples are skipped).
function heapDuringPlay(report) {
  return report.heap.filter((h) => h.frame >= 100).map((h) => h.free);
}

test("every class compiles without errors", async () => {
  const sim = await loadSimulator();
  const { errors, classes } = compileFolder(sim, PROGRAM);
  assert.deepEqual(errors, []);
  assert.ok(classes >= 13, `expected at least 13 classes, got ${classes}`);
});

test("a screen-reading bot plays through portals, roof phases and speed-ups", async () => {
  const report = await run({ program: PROGRAM, frames: 4000, bot: true });
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.equal(report.frames, 4000);
  assert.ok(report.bot.roofSeen, "never reached a roof phase");
  assert.ok(report.bot.bestPortals >= 4, `crossed only ${report.bot.bestPortals} portals`);
});

test("the heap does not shrink during play", async () => {
  const report = await run({ program: PROGRAM, frames: 3000, bot: true });
  const free = heapDuringPlay(report);
  assert.ok(free.length > 10);
  assert.equal(Math.min(...free), Math.max(...free), `heap changed: ${free.join(",")}`);
});

test("retrying after game over reuses memory", async () => {
  // Start, never jump (dies on the first spikes), retry three times.
  const presses = [5, 400, 800, 1200].map((f) => ({ from: f, to: f + 2, key: 32 }));
  const report = await run({ program: PROGRAM, frames: 1600, presses });
  assert.equal(report.ok, true, report.errors.join("; "));
  const free = heapDuringPlay(report);
  assert.equal(Math.min(...free), Math.max(...free), `heap changed: ${free.join(",")}`);
});

test("a tick stays under 9000 VM instructions on average", async () => {
  const report = await run({ program: PROGRAM, frames: 3000, bot: true });
  assert.ok(report.stepsPerFrame < 9000, `${report.stepsPerFrame} VM steps per tick`);
});
