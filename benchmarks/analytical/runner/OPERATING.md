## Available environment

The application is already served at http://127.0.0.1:4173. Do not start another
server. Your only persistent application edit target is /task/index.html. The task
and assistance files are read-only. Use /tmp for temporary inspection scripts and
screenshots. Do not add application or requirement files or change requirements.
Preconfigured tools may write their normal disposable reports and review state;
in particular, .ui-review/runs/ and .ui-review/latest.json are writable output
locations. Run configured checks directly in /task. Keep the existing config.json,
rules.json, checkpoint.mjs, and all other task or assistance files unchanged.

Node and Playwright are installed. Import Playwright from
/opt/runtime/node_modules/playwright/index.mjs, or use
require('/opt/runtime/node_modules/playwright') in a Node script. Chromium is
preinstalled; launch it with
chromium.launch({executablePath: process.env.TRIAL_BROWSER_PATH}). Browser access is local
only. Use the image-viewing tool to inspect screenshots when useful. Source and
browser inspection are available equally to every task. No external websites,
additional packages, repository, prior sessions, or other tasks are available.

Perform the task in this session. Your final answer should identify defects or a
clean result, cite the evidence you collected, explain any changes and verification,
and state unresolved limitations. Do not claim human approval.
