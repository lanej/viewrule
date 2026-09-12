# Security

Viewrule opens configured web applications in Chromium. Use trusted local or
authorized test environments. It is not a sandbox for hostile pages; a page can
load third-party resources through the browser. Do not feed untrusted configuration
or reports into a process with sensitive credentials.

Screenshots, HTML, JSON, URLs, paths, and free-text feedback can contain private
application data. Review artifacts before committing or uploading them. Keep
Playwright authentication state out of version control. The generated project
ignore file excludes run output and `auth*.json`, but cannot recognize every secret.

Viewrule has no telemetry or model-service integration. Its Stop hook and editable
local reports are workflow aids, not tamper-resistant attestations. Use repository
access controls and required CI checks for merge policy.

Only the latest release receives fixes during 0.x. Report a vulnerability through
the repository's private **Report a vulnerability** option when available. If that
option is unavailable, open an issue requesting a private contact without posting
exploit details or credentials. No response-time SLA is promised.
