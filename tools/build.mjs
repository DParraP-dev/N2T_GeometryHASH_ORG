#!/usr/bin/env node
// Compiles a Jack program folder to .vm files with the web IDE compiler.
//
//   node tools/build.mjs HackDash            -> build/HackDash/*.vm
//   node tools/build.mjs HackDash out/dir    -> out/dir/*.vm
//
// The output folder can be loaded in the desktop VM Emulator. The official
// JackCompiler (tools/JackCompiler.sh or .bat) produces equivalent code.

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { compileFolder, loadSimulator } from "./lib/n2t.mjs";

const [src, outArg] = process.argv.slice(2);
if (!src) {
  console.error("usage: node tools/build.mjs <programDir> [outDir]");
  process.exit(2);
}

const sim = await loadSimulator();
const { vm, errors, classes } = compileFolder(sim, resolve(src));
if (errors.length) {
  for (const e of errors) console.error(e);
  process.exit(1);
}

const out = resolve(outArg ?? join("build", basename(resolve(src))));
mkdirSync(out, { recursive: true });
for (const [name, text] of Object.entries(vm)) writeFileSync(join(out, `${name}.vm`), text);
console.log(`compiled ${classes} classes -> ${out}`);
