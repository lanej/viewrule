#!/usr/bin/env node
import { run } from "./runtime.mjs";

try {
  await run(process.argv.slice(2));
} catch (err) {
  console.error(`viewrule: ${err.message}`);
  process.exitCode = 2;
}
