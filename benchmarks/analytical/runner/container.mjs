// Shared controller; contains no cases, reference outcomes, or evaluator.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const emit = (value) => console.log(JSON.stringify(value));
const settings = JSON.parse(process.env.TRIAL_SETTINGS);
const server = createServer(async (req, res) => {
  if (req.url !== "/") return res.writeHead(404).end();
  res.setHeader("Content-Type", "text/html");
  res.end(await readFile("/task/index.html"));
});
await new Promise((resolve) =>
  server.listen(4173, "127.0.0.1", () => resolve(undefined)),
);

const child = spawn("codex", ["app-server"], {
  cwd: "/task",
  stdio: ["pipe", "pipe", "pipe"],
});
child.stderr.on("data", (data) =>
  emit({ kind: "runner-stderr", text: String(data) }),
);
const pending = new Map();
let serial = 0;
let threadId,
  turnId,
  usage,
  outcome,
  finished = false;
const started = Date.now();
function send(message) {
  emit({ kind: "client", message });
  child.stdin.write(JSON.stringify(message) + "\n");
}
function request(method, params) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    send({ id, method, params });
  });
}
function finish(status, extra = {}) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  emit({
    kind: "result",
    status,
    elapsedMs: Date.now() - started,
    usage: usage ?? null,
    ...extra,
  });
  child.kill("SIGTERM");
  server.close();
  setTimeout(() => process.exit(status === "completed" ? 0 : 1), 500).unref();
}
const deadline = setTimeout(
  () => finish("wall-time-limit"),
  settings.wallTimeSeconds * 1000,
);
child.on("error", (error) => finish("runner-error", { error: error.message }));
child.on("exit", (code, signal) => {
  if (!finished) finish("runner-exited", { code, signal });
});
createInterface({ input: child.stdout }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return emit({ kind: "unparsed", line });
  }
  emit({ kind: "server", message });
  if (message.id != null && pending.has(message.id)) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? item.reject(new Error(JSON.stringify(message.error)))
      : item.resolve(message.result);
  } else if (message.id != null && message.method) {
    send({
      id: message.id,
      error: {
        code: -32000,
        message:
          "Interactive requests are unavailable in this controlled trial.",
      },
    });
  }
  if (message.method === "thread/tokenUsage/updated") {
    usage = message.params.tokenUsage.total;
    // Check at every reported model response, not only at final completion.
    // Over-budget outputs are invalid and never counted as successful trials.
    if (usage.totalTokens > settings.maxTokens) finish("token-limit-exceeded");
  }
  if (message.method === "turn/completed") {
    outcome = message.params.turn;
    finish(outcome.status === "completed" ? "completed" : outcome.status, {
      turn: outcome,
    });
  }
});

try {
  await request("initialize", {
    clientInfo: { name: "viewrule-repair-trial", version: "1" },
    capabilities: { experimentalApi: true },
  });
  send({ method: "initialized", params: {} });
  const result = await request("thread/start", {
    cwd: "/task",
    model: settings.model,
    ephemeral: true,
    approvalPolicy: "never",
    sandbox: "danger-full-access",
    config: {
      model_reasoning_effort: settings.reasoning,
      web_search: "disabled",
      features: { multi_agent: false },
      personality: "none",
    },
  });
  threadId = result.thread.id;
  let prompt = await readFile("/task/TASK.md", "utf8");
  prompt += "\n\n" + (await readFile("/opt/runtime/OPERATING.md", "utf8"));
  if (settings.assistance)
    prompt +=
      "\n\nUse the supplied assistance at " +
      settings.assistance +
      ". Read it before reviewing or editing the UI. It is subordinate to the task requirements.";
  const turn = await request("turn/start", {
    threadId,
    effort: settings.reasoning,
    model: settings.model,
    input: [{ type: "text", text: prompt }],
  });
  turnId = turn.turn.id;
  emit({
    kind: "started",
    threadId,
    turnId,
    model: result.model,
    reasoning: settings.reasoning,
  });
} catch (error) {
  finish("runner-error", { error: error.message });
}
