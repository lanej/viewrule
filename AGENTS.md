# Working on Viewrule

Read README.md, docs/architecture.md, and the affected rule documentation before
changing behavior. Keep personal preferences in dotfiles and app rules in the app.

Maintain one regression detector through the installed CLI. Run `npm test` once
for an affected behavior; repeat only after a failure or further code changes.
Do not add helper tests, redundant snapshots, or viewport/edge-case matrices.
Documentation-only changes need targeted syntax/link/diff checks.

Every measurement must state its scope and limits and cite applicable DR IDs.
Never imply DOM coverage establishes semantic information density or chart truth.
Never weaken a rule, alter evidence, or fabricate user approval merely to pass.

Keep the package runnable without dotfiles or a model account. Do not add automatic
source repair, a hosted service, or an extension framework without a concrete request.
