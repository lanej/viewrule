// Host-side orchestration. Never mounted in an agent container.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const [command, target, ...requested] = process.argv.slice(2);
assert.ok(
  target,
  "Usage: run-repair-trials.mjs <freeze|preflight|run> <prepared-directory> [task-NNN ...]",
);
const directory = path.resolve(target);
const manifestPath = path.join(directory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
const imageName = (arm) => `viewrule-trial-${arm}:20260915`;
const network = "viewrule-trial-private-20260915";
const gateway = "viewrule-trial-egress-20260915";
const externalNetwork = "viewrule-trial-egress-network-20260915";
const auth = path.join(homedir(), ".codex/auth.json");
const frozenHash = await readFile(path.join(directory, "evaluator.mjs")).then(
  hash,
);
assert.equal(frozenHash, manifest.evaluatorSHA256, "Frozen evaluator changed");
const readOnly = (source, destination) => [
  "--mount",
  `type=bind,src=${source},dst=${destination},readonly`,
];
const writable = (source, destination) => [
  "--mount",
  `type=bind,src=${source},dst=${destination}`,
];

function hardened(name) {
  return [
    "run",
    "--rm",
    "--name",
    name,
    "--user",
    "0:0",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "512",
    "--cpus",
    "2",
    "--memory",
    "3g",
    "--shm-size",
    "512m",
    "--tmpfs",
    "/tmp:rw,size=1g",
    "--tmpfs",
    "/root:rw,size=256m",
    "-e",
    "CI=1",
    "-e",
    `TRIAL_BROWSER_PATH=${manifest.execution?.browserExecutable ?? ""}`,
    "-e",
    `VIEWRULE_BROWSER_PATH=${manifest.execution?.browserExecutable ?? ""}`,
    "-e",
    `IMPECCABLE_BROWSER=${manifest.execution?.browserExecutable ?? ""}`,
    ...readOnly(
      path.join(root, "benchmarks/analytical/runner/OPERATING.md"),
      "/opt/runtime/OPERATING.md",
    ),
  ];
}

async function runnerFiles() {
  const result = {
    "scripts/run-repair-trials.mjs": hash(await readFile(import.meta.filename)),
  };
  for (const file of await readdir(
    path.join(root, "benchmarks/analytical/runner"),
  )) {
    result[`benchmarks/analytical/runner/${file}`] = hash(
      await readFile(path.join(root, "benchmarks/analytical/runner", file)),
    );
  }
  return result;
}

if (command === "freeze") {
  assert.equal(manifest.status, "prepared-not-run");
  const images = {};
  for (const arm of ["baseline", "impeccable", "viewrule"])
    images[arm] = docker([
      "image",
      "inspect",
      imageName(arm),
      "--format",
      "{{.Id}}",
    ]);
  const browserIdentity = JSON.parse(
    docker([
      "run",
      "--rm",
      "--network",
      "none",
      images.baseline,
      "node",
      "--input-type=module",
      "-e",
      'import {chromium} from "/opt/runtime/node_modules/playwright/index.mjs"; import {readFile} from "node:fs/promises"; import {createHash} from "node:crypto"; const executable=chromium.executablePath(); const b=await chromium.launch({executablePath:executable}); console.log(JSON.stringify({version:b.version(),executable,sha256:createHash("sha256").update(await readFile(executable)).digest("hex")})); await b.close();',
    ]),
  );
  manifest.runner = {
    provider: "OpenAI Codex with existing ChatGPT login",
    model: "gpt-6-astra",
    reasoning: "xhigh",
    runnerVersion: "codex-cli 0.153.4; viewrule-repair-trial controller 1",
    maxTokens: 1000000,
    wallTimeSeconds: 600,
    browserVersion: browserIdentity.version,
  };
  manifest.execution = {
    images,
    concurrency: 3,
    browserExecutable: browserIdentity.executable,
    browserSHA256: browserIdentity.sha256,
    files: await runnerFiles(),
    createdAt: new Date().toISOString(),
    tokenAccounting:
      "Provider-reported cumulative input plus output tokens, including cached input; interrupted on first update over ceiling and classified invalid. A single response may overshoot before usage is reported.",
    backendRevision: null,
    backendRevisionLimit:
      "The service exposes the requested model ID, not an immutable backend snapshot.",
    scheduling:
      "Up to three concurrent trials per rotated group; separate fresh container and session per trial. Elapsed times are observations, not speed comparisons.",
    filesystem:
      "Read-only image and task root; index.html and Viewrule disposable state writable; original requirements individually read-only. No source repository, evaluator, parent manifest, or other trial mounted.",
    network:
      "Internal container network with CONNECT egress restricted to Codex authentication/model hosts; no general internet or host socket.",
    providerCost: null,
    authoredContractCost: null,
  };
  await writeFile(manifestPath, json(manifest));
  await writeFile(
    path.join(directory, "frozen-evaluator.sha256"),
    frozenHash + "\n",
  );
  console.log(json({ pinned: manifest.runner, images }));
  process.exit(0);
}

assert.deepEqual(
  await runnerFiles(),
  manifest.execution.files,
  "Runner changed after freeze",
);
for (const arm of Object.keys(manifest.execution.images))
  assert.equal(
    docker([
      "image",
      "inspect",
      manifest.execution.images[arm],
      "--format",
      "{{.Id}}",
    ]),
    manifest.execution.images[arm],
  );

function trialArgs(trial, name) {
  const task = path.join(directory, trial.id);
  const args = [
    ...hardened(name),
    "--network",
    network,
    "-e",
    "HTTPS_PROXY=http://gateway:8080",
    "-e",
    "HTTP_PROXY=http://gateway:8080",
    "-e",
    "NO_PROXY=127.0.0.1,localhost",
    ...readOnly(task, "/task"),
    ...writable(path.join(task, "index.html"), "/task/index.html"),
    ...readOnly(auth, "/root/.codex/auth.json"),
  ];
  if (trial.arm === "viewrule") {
    args.push(...writable(path.join(task, ".ui-review"), "/task/.ui-review"));
    for (const file of ["config.json", "rules.json", "checkpoint.mjs"])
      args.push(
        ...readOnly(
          path.join(task, ".ui-review", file),
          `/task/.ui-review/${file}`,
        ),
      );
  }
  return args;
}

function networkSetup() {
  try {
    docker(["network", "inspect", externalNetwork]);
  } catch {
    docker(["network", "create", externalNetwork]);
  }
  try {
    docker(["network", "inspect", network]);
  } catch {
    docker(["network", "create", "--internal", network]);
  }
  try {
    docker(["inspect", gateway]);
  } catch {
    docker([
      "run",
      "-d",
      "--name",
      gateway,
      "--network",
      externalNetwork,
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      manifest.execution.images.baseline,
      "node",
      "/opt/runtime/connect-proxy.mjs",
    ]);
    docker(["network", "connect", "--alias", "gateway", network, gateway]);
  }
}

function evaluate(id, stage) {
  const output = docker([
    ...hardened(`viewrule-evaluate-${id}`),
    "--network",
    "none",
    ...readOnly(root, "/engine"),
    ...writable(directory, "/trials"),
    manifest.execution.images.baseline,
    "node",
    "/engine/scripts/repair-trial.mjs",
    "evaluate",
    "/trials",
    id,
    frozenHash,
    stage,
  ]);
  return JSON.parse(output);
}

async function preflight() {
  networkSetup();
  const observations = [];
  for (const arm of ["baseline", "impeccable", "viewrule"]) {
    const trial = manifest.trials.find((item) => item.arm === arm);
    const code = `const fs=require('fs'); const assert=require('assert/strict');
      for(const file of ['/trials/manifest.json','/engine','/Users','/var/run/docker.sock']) assert.equal(fs.existsSync(file),false,file);
      for(const file of ['/task/TASK.md',${arm === "viewrule" ? "'/task/.ui-review/rules.json', '/task/.ui-review/config.json'," : ""}]) {let protectedFile=false;try{fs.accessSync(file,fs.constants.W_OK)}catch{protectedFile=true}assert.ok(protectedFile,file)}
      fs.accessSync('/task/index.html',fs.constants.W_OK);
      fs.accessSync('/root/.codex/auth.json',fs.constants.R_OK);
      console.log('filesystem-boundary-ok');`;
    const result = docker([
      ...trialArgs(trial, `viewrule-preflight-${arm}`),
      manifest.execution.images[arm],
      "node",
      "-e",
      code,
    ]);
    observations.push({ arm, result });
  }
  // Check real network denial, not just network metadata.
  const trial = manifest.trials[0];
  const blocked = docker([
    ...trialArgs(trial, "viewrule-preflight-network"),
    manifest.execution.images.baseline,
    "node",
    "--input-type=module",
    "-e",
    'import net from "node:net"; await new Promise((resolve,reject)=>{const s=net.connect(443,"1.1.1.1",()=>reject(new Error("Direct egress permitted")));s.setTimeout(1500,()=>{s.destroy();resolve();});s.on("error",()=>resolve());}); console.log("direct-egress-blocked");',
  ]);
  await writeFile(
    path.join(directory, "isolation-preflight.json"),
    json({
      observations,
      network: blocked,
      recordedAt: new Date().toISOString(),
    }),
  );
  console.log(json({ observations, network: blocked }));
}

async function run(trial) {
  const resultDirectory = path.join(directory, "results", trial.id);
  try {
    await access(path.join(resultDirectory, "result.json"));
    console.log(`${trial.id}: already recorded`);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(resultDirectory, { recursive: true });
  const input = await readFile(path.join(directory, trial.id, "index.html"));
  assert.equal(hash(input), trial.sourceSHA256, "Starting application changed");
  await writeFile(path.join(resultDirectory, "before.html"), input);
  const before = evaluate(trial.id, "before");
  const settings = {
    ...manifest.runner,
    assistance:
      trial.arm === "viewrule"
        ? "/task/VIEWRULE.md"
        : trial.arm === "impeccable"
          ? "/task/.agents/skills/impeccable/SKILL.md"
          : null,
  };
  const args = [
    ...trialArgs(trial, `viewrule-run-${trial.id}`),
    "-e",
    `TRIAL_SETTINGS=${JSON.stringify(settings)}`,
    manifest.execution.images[trial.arm],
    "node",
    "/opt/runtime/container.mjs",
  ];
  const transcript = createWriteStream(
    path.join(resultDirectory, "transcript.jsonl"),
  );
  const stderr = createWriteStream(path.join(resultDirectory, "stderr.txt"));
  const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
  let lineBuffer = "",
    completion = null;
  child.stdout.on("data", (chunk) => {
    transcript.write(chunk);
    lineBuffer += chunk;
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop();
    for (const line of lines) {
      try {
        const value = JSON.parse(line);
        if (value.kind === "result") completion = value;
      } catch {
        // Unparsed runner output stays in the transcript for diagnosis.
      }
    }
  });
  child.stderr.pipe(stderr);
  // Independent host deadline survives a failed or stopped in-container controller.
  const timer = setTimeout(
    () => {
      try {
        docker(["kill", `viewrule-run-${trial.id}`]);
      } catch {
        // A container that already exited needs no further termination.
      }
    },
    (settings.wallTimeSeconds + 30) * 1000,
  );
  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  clearTimeout(timer);
  await new Promise((resolve) => transcript.end(() => resolve(undefined)));
  const output = await readFile(path.join(directory, trial.id, "index.html"));
  await writeFile(path.join(resultDirectory, "after.html"), output);
  let patch;
  try {
    patch = execFileSync(
      "git",
      [
        "diff",
        "--no-index",
        "--",
        path.join(resultDirectory, "before.html"),
        path.join(resultDirectory, "after.html"),
      ],
      { encoding: "utf8" },
    );
  } catch (error) {
    if (error.status !== 1) throw error;
    patch = String(error.stdout);
  }
  await writeFile(path.join(resultDirectory, "repair.patch"), patch);
  let after = null,
    evaluationError = null;
  try {
    after = evaluate(trial.id, "after");
  } catch (error) {
    evaluationError = error.message;
  }
  const result = {
    trialId: trial.id,
    runner: manifest.runner,
    image: manifest.execution.images[trial.arm],
    hostRunnerSHA256: manifest.execution.files["scripts/run-repair-trials.mjs"],
    status: completion?.status ?? "failed-start-or-missing-result",
    exitCode,
    inputSHA256: hash(input),
    outputSHA256: hash(output),
    changed: !input.equals(output),
    transcript: "transcript.jsonl",
    patch: "repair.patch",
    elapsedMs: completion?.elapsedMs ?? null,
    inputTokens: completion?.usage?.inputTokens ?? null,
    outputTokens: completion?.usage?.outputTokens ?? null,
    usage: completion?.usage ?? null,
    providerCost: null,
    setupElapsedMs: null,
    before,
    after,
    evaluationError,
    semanticReview: null,
    explanationReview: null,
  };
  await writeFile(path.join(resultDirectory, "result.json"), json(result));
  console.log(json(result));
  if (result.status !== "completed" || evaluationError || !result.usage)
    throw new Error(
      `Operational failure in ${trial.id}; later trials were not started`,
    );
}

if (command === "preflight") await preflight();
else if (command === "run") {
  await access(path.join(directory, "isolation-preflight.json"));
  networkSetup();
  const trials = requested.length
    ? requested.map((id) => {
        const trial = manifest.trials.find((item) => item.id === id);
        assert.ok(trial, `Unknown task ${id}`);
        return trial;
      })
    : manifest.trials;
  const concurrency = manifest.execution.concurrency ?? 1;
  assert.ok(
    Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3,
  );
  // Complete each rotated three-arm group before starting the next group.
  // An operational failure drains the current group and stops later groups.
  for (let offset = 0; offset < trials.length; offset += concurrency) {
    const results = await Promise.allSettled(
      trials.slice(offset, offset + concurrency).map(run),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  }
} else throw new Error("Use freeze, preflight, or run");
