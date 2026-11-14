#!/usr/bin/env node
// Headless runner for a Jack program on the official nand2tetris simulator.
//
// Compiles every .jack file in a folder, runs it on the VM, replays scripted
// key presses and saves screenshots. One "frame" is one call to Sys.wait, so
// runs are deterministic and do not depend on real time.
//
//   node tools/sim.mjs HackDash --frames 600 --press 5:32 --shot 300:out/a.png
//
// Options:
//   --frames N         stop after N frames (default 300)
//   --press A[-B]:KEY  hold KEY (Hack key code) during frames A..B
//   --shot F:FILE      save the screen as PNG at frame F
//   --json             print the full report as JSON
//
// Exit code 0 when the program compiled and did not stop with an ERR code.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { KEYBOARD, buildVm, compileFolder, freeHeapWords, loadSimulator } from "./lib/n2t.mjs";
import { screenToPng } from "./lib/png.mjs";

const MAX_STEPS_PER_FRAME = 2_000_000;

export function parseArgs(argv) {
  const opts = { program: null, frames: 300, presses: [], shots: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--frames") opts.frames = Number(argv[++i]);
    else if (a === "--press") {
      const [range, key] = argv[++i].split(":");
      const [from, to] = range.split("-").map(Number);
      opts.presses.push({ from, to: to ?? from, key: Number(key) });
    } else if (a === "--shot") {
      const [frame, ...file] = argv[++i].split(":");
      opts.shots.push({ frame: Number(frame), file: file.join(":") });
    } else if (a === "--json") opts.json = true;
    else opts.program = a;
  }
  if (!opts.program) throw new Error("usage: node tools/sim.mjs <programDir> [options]");
  return opts;
}

function scriptedKey(presses, frame) {
  for (const p of presses) if (frame >= p.from && frame <= p.to) return p.key;
  return 0;
}

function saveShot(vm, file) {
  mkdirSync(dirname(resolve(file)), { recursive: true });
  writeFileSync(file, screenToPng(vm.RAM));
}

/**
 * Runs a program. `opts.input(vm, frame)` may return the key to hold this
 * frame; by default the --press script is used. `opts.onFrame(vm, frame)` is
 * called once per frame after the program waits.
 */
export async function run(opts) {
  const sim = await loadSimulator();
  const { vm: code, errors, classes } = compileFolder(sim, resolve(opts.program));
  if (errors.length) return { ok: false, stage: "compile", errors, classes };

  const vm = buildVm(sim, code);
  const input = opts.input ?? ((_, frame) => scriptedKey(opts.presses ?? [], frame));

  // Replace the real-time wait with a frame counter. The game still calls
  // Sys.wait once per tick, so a frame here is a game tick.
  let frame = 0;
  vm.os.sys.wait = (ms) => {
    if (ms <= 0) vm.os.sys.error(1);
    frame++;
  };

  const shots = [...(opts.shots ?? [])].sort((a, b) => a.frame - b.frame);
  const heap = [];
  let steps = 0;
  let stepsThisFrame = 0;
  let lastFrame = 0;
  let exitCode;
  vm.RAM.set(KEYBOARD, input(vm, 0));

  while (frame < opts.frames) {
    exitCode = vm.step();
    steps++;
    if (exitCode !== undefined) break;
    if (frame === lastFrame) {
      if (++stepsThisFrame > MAX_STEPS_PER_FRAME) {
        return { ok: false, stage: "run", errors: [`no Sys.wait for ${MAX_STEPS_PER_FRAME} steps at frame ${frame}`], frames: frame };
      }
      continue;
    }
    lastFrame = frame;
    stepsThisFrame = 0;
    if (frame % 50 === 0) heap.push({ frame, free: freeHeapWords(vm) });
    while (shots.length && shots[0].frame <= frame) saveShot(vm, shots.shift().file);
    opts.onFrame?.(vm, frame);
    vm.RAM.set(KEYBOARD, input(vm, frame));
  }
  for (const s of shots) saveShot(vm, s.file);

  const crashed = exitCode !== undefined && exitCode !== 0;
  return {
    ok: !crashed,
    stage: "run",
    classes,
    frames: frame,
    steps,
    exitCode: exitCode ?? null,
    errors: crashed ? [`program stopped with ERR${exitCode} at frame ${frame}`] : [],
    heap,
    freeHeap: freeHeapWords(vm),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parseArgs(process.argv.slice(2));
  const report = await run(opts);
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${report.ok ? "OK" : "FAIL"} [${report.stage}] frames=${report.frames ?? 0} steps=${report.steps ?? 0} freeHeap=${report.freeHeap ?? "?"}`);
    for (const e of report.errors ?? []) console.log(`  ${e}`);
  }
  process.exit(report.ok ? 0 : 1);
}
