// Smoke tests for Hack Dash on the official nand2tetris VM.
// Run with:  npm test      (needs the simulator, see tools/README.md)

import { before, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadSimulator, compileFolder } from "../tools/lib/n2t.mjs";
import { run } from "../tools/sim.mjs";
import { gameOverVisible } from "../tools/lib/bot.mjs";

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

// One deterministic bot game shared by the tests below.
let botGame;
before(async () => {
  botGame = await run({ program: PROGRAM, frames: 4000, bot: true });
});

test("a screen-reading bot plays through portals, roof phases and speed-ups", () => {
  assert.equal(botGame.ok, true, botGame.errors.join("; "));
  assert.equal(botGame.frames, 4000);
  assert.ok(botGame.bot.roofSeen, "never reached a roof phase");
  assert.ok(botGame.bot.bestPortals >= 4, `crossed only ${botGame.bot.bestPortals} portals`);
});

test("the heap does not shrink during play", () => {
  const free = heapDuringPlay(botGame);
  assert.ok(free.length > 10);
  assert.equal(Math.min(...free), Math.max(...free), `heap changed: ${free.join(",")}`);
});

test("retrying after game over reuses memory", async () => {
  // Start, never jump (dies on the first spikes), retry three times.
  const presses = [5, 400, 800, 1200].map((f) => ({ from: f, to: f + 2, key: 32 }));
  let gameOvers = 0;
  let showing = false;
  const onFrame = (vm) => {
    const now = gameOverVisible(vm);
    if (now && !showing) gameOvers++;
    showing = now;
  };
  const report = await run({ program: PROGRAM, frames: 1600, presses, onFrame });
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.ok(gameOvers >= 4, `expected 4 game overs, saw ${gameOvers}`);
  const free = heapDuringPlay(report);
  assert.equal(Math.min(...free), Math.max(...free), `heap changed: ${free.join(",")}`);
});

test("a tick stays under 9000 VM instructions on average", () => {
  assert.ok(botGame.stepsPerFrame < 9000, `${botGame.stepsPerFrame} VM steps per tick`);
});
