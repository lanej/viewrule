# Running the controlled comparison locally

The [trial protocol](agent-trial.md) defines the task and evaluation. The optional
[container runner](../../scripts/run-repair-trials.mjs) supplies the missing
execution boundary: a fresh Codex session and container per task, protected
requirements, local browser access, and recorded usage, transcripts, patches, and
independent evaluations. It does not change the Viewrule engine or install hooks.

The [2026-09-15 pilot](pilot-2026-09-15.md) contains nine completed sessions. It
does not complete the full study or its blind review. To reproduce that subset,
pass `task-001 task-002 task-003 task-067 task-068 task-069 task-079 task-080 task-081`
after the prepared directory in the `run` command. Omitting IDs selects all 81;
record the chosen scope before execution. A recorded result is never overwritten,
including a failed attempt; use a new prepared experiment for retries.

## Recorded configuration

The initial implementation targets Linux ARM64 containers on a Docker-compatible
local host with an existing Codex ChatGPT login in `~/.codex/auth.json`. Docker or
Podman must support bind mounts, internal networks, read-only filesystems, and
resource limits. It does not provision credentials or call a separately billed API.
The model service's normal account usage applies.

- Model ID: `gpt-6-astra`, reasoning `xhigh`, Codex CLI `0.153.4`.
- One session per task; up to three concurrent trials per rotated group.
- Ten minutes and 1,000,000 cumulative input-plus-output tokens per task.
- Token accounting includes cached input and checks every usage notification.
  A response can cross the ceiling before its usage is reported; the runner
  interrupts and invalidates such an output rather than calling it successful.
- Chromium `151.0.7922.34`, Playwright `1.62.1`, both original CSS viewports and
  both initial/filtered states. The executable path and SHA-256 are frozen.
- Per-container limits: two CPUs, 3 GiB memory, 512 processes, and 512 MiB shared
  memory. `CI=1` supplies Impeccable's supported container browser launch flags.

The requested model ID is fixed; the service does not expose an immutable backend
revision through this runner. Results must disclose that limitation. Provider cost
and authored-contract labor remain unknown unless separately supplied. Preparation
elapsed time is not rule-authoring cost. Repair elapsed time is an observation,
not a controlled tool-speed benchmark.

## Build and prepare

Start from a clean Viewrule checkout with `npm ci` completed. Use an external
directory for the build context and prepared experiment. The build context must
contain only the runner files, a packed engine, and the plugin:

```sh
mkdir /tmp/viewrule-trial-build
cp benchmarks/analytical/runner/* /tmp/viewrule-trial-build/
npm pack --pack-destination /tmp/viewrule-trial-build
mv /tmp/viewrule-trial-build/viewrule-0.5.1.tgz /tmp/viewrule-trial-build/engine.tgz
cp -R plugins/claude-code /tmp/viewrule-trial-build/plugin
for arm in baseline impeccable viewrule; do
  docker build --load --target "$arm" \
    -t "viewrule-trial-$arm:20260915" /tmp/viewrule-trial-build
done
```

The Dockerfile pins its browser base image by digest. Baseline contains Codex,
Node, and Playwright. The other images add only their own assistance. Impeccable
pins CLI `4.1.0` and engine `0.1.5`. Viewrule uses the packed current checkout and
an isolated plugin receipt pointing at that exact archive, without downloading a
different published release. The development archive is identified by hash and
source revision; its package version alone does not identify its contents.

Prepare neutral tasks using the exact Impeccable revision in the protocol, then:

```sh
node scripts/repair-trial.mjs prepare /tmp/viewrule-trials /tmp/impeccable-trial-source
node scripts/run-repair-trials.mjs freeze /tmp/viewrule-trials
node scripts/run-repair-trials.mjs preflight /tmp/viewrule-trials
node scripts/run-repair-trials.mjs run /tmp/viewrule-trials
```

`freeze` records the image IDs, runner/source hashes, browser identity, and common
settings. Runtime commands reject changed runner files. The common operating
instructions are bound read-only over the image copy. After execution starts, keep
this material unchanged; use a new prepared experiment for protocol corrections
and retain excluded attempts separately.

Preflight checks that agents cannot access the source checkout, manifest, other
tasks, or host container socket, and that protected requirements are read-only.
It also tests direct network denial. Verify model access and both assistance tools
on separate disposable preflight inputs before starting the recorded comparison.
The frozen evaluator's existing `verify` command remains a separate validation
against original inputs, not an agent outcome.

## Filesystem and network boundary

The image and task root are read-only. Only `index.html`, temporary scratch space,
and Viewrule's disposable review state are writable. Viewrule configuration,
rules, and checkpoint files are individually mounted read-only inside its state
directory; the evaluator additionally checks every protected input hash. The
parent experiment, evaluator, repository, and other tasks are never mounted in an
agent container. Evaluation runs separately with no network.

Containers use an internal network. A separate CONNECT proxy permits only the
Codex model/authentication hosts, with no general internet or host socket access.
The existing login file is mounted read-only into the disposable runner home; it
is not copied into an image or an output artifact. Capabilities are dropped, the
filesystem is read-only, and privilege escalation is disabled. The outer container
provides the filesystem boundary for Codex commands and the synthetic-page browser.

The launcher creates only named `viewrule-trial-*20260915` networks and an egress
container. After all trials finish, remove that egress container and those two
networks explicitly. Never delete unrelated containers or prune the user's caches.

## Outcomes and review

Each `results/task-NNN/` directory contains the full event transcript, stderr,
original/repaired source, patch, usage, and result metadata. Original-size captures
and independent observations live outside the task directory. Failed starts,
missing usage, altered protected files, budget overruns, and unavailable evaluations
are explicit; execution stops on operational failures so they cannot silently
become successful trials. Existing recorded results are never overwritten.

Evaluate repairs, regressions, and clean-control edits separately. An evaluator
pass is a scoped deterministic result. Explanation grading and semantic/human
review are separate fields; the runner leaves them unset. Before publishing,
prepare anonymized review materials and remove account metadata from transcript
copies, retaining the original records locally. Do not infer human approval or
comparative superiority from a passing detector or a small set of trials.
