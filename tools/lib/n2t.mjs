// Loads the official nand2tetris web IDE simulator and compiles Jack code.
//
// The simulator lives in https://github.com/nand2tetris/web-ide. Point
// N2T_WEB_IDE at a checkout where `projects`, `runner` and `simulator`
// have been built (see tools/README.md). Default:
// ~/.local/share/nand2tetris/web-ide

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

export const SCREEN = 16384;
export const KEYBOARD = 24576;

export function webIdeRoot() {
  return process.env.N2T_WEB_IDE ?? join(homedir(), ".local/share/nand2tetris/web-ide");
}

export async function loadSimulator() {
  const root = webIdeRoot();
  const build = join(root, "simulator/build");
  if (!existsSync(build)) {
    throw new Error(`simulator build not found at ${build}. See tools/README.md.`);
  }
  const load = (p) => import(pathToFileURL(join(build, p)).href);
  const [{ compile }, { VM }, { Vm }, result] = await Promise.all([
    load("jack/compiler.js"),
    load("languages/vm.js"),
    load("vm/vm.js"),
    import(pathToFileURL(join(root, "node_modules/@davidsouther/jiffies/lib/esm/result.js")).href),
  ]);
  return { compile, VM, Vm, isErr: result.isErr, unwrap: result.unwrap };
}

/** Reads every .jack file in `dir` and returns { ClassName: source }. */
export function readJackSources(dir) {
  const sources = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".jack"))) {
    sources[basename(f, ".jack")] = readFileSync(join(dir, f), "utf8");
  }
  return sources;
}

/**
 * Compiles a folder of .jack files.
 * Returns { vm: { Name: vmText }, errors: [string], classes: n }.
 */
export function compileFolder(sim, dir) {
  const sources = readJackSources(dir);
  const compiled = sim.compile(sources);
  const vm = {};
  const errors = [];
  for (const [name, out] of Object.entries(compiled)) {
    if (typeof out === "string") vm[name] = out;
    else errors.push(`${name}.jack: ${out.message}${out.span ? ` (line ${out.span.line})` : ""}`);
  }
  return { vm, errors, classes: Object.keys(sources).length };
}

/** Builds a runnable VM from compiled code. Returns the Vm or throws. */
export function buildVm(sim, vmTexts) {
  const files = Object.entries(vmTexts).map(([name, text]) => ({
    name,
    instructions: sim.unwrap(sim.VM.parse(text)).instructions,
  }));
  const built = sim.Vm.buildFromFiles(files);
  if (sim.isErr(built)) throw new Error(String(built.err?.message ?? "could not load VM code"));
  return sim.unwrap(built);
}

/** Words still free on the OS heap (walks the free list). */
export function freeHeapWords(vm) {
  const ram = vm.RAM;
  let total = 0;
  let p = vm.os.memory.freeListPtr;
  for (let guard = 0; p !== 0 && guard < 20000; guard++) {
    total += ram.get(p + 1);
    p = ram.get(p);
  }
  return total;
}

/** True if the screen pixel (x, y) is black. */
export function pixel(vm, x, y) {
  const word = vm.RAM.get(SCREEN + y * 32 + (x >> 4)) & 0xffff;
  return ((word >> (x & 15)) & 1) === 1;
}
