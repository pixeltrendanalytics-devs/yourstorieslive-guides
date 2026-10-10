# AWS POC transfer to the consolidated GitHub account

Date: 10 October 2026 (Asia/Singapore).

The POC code is carried onto the latest new repository code in two independent
feature branches. The original POC clones and the new main branches are retained.
No AWS environment is deployed as part of this transfer.

| Project | New clone | Repository | Feature branch | Main at transfer |
| --- | --- | --- | --- | --- |
| Next.js frontend | `<workspace>/ysl-ltd/yourstorieslive` | `pixeltrendanalytics-devs/yourstorieslive` | `codex/aws-media-poc` | `9b5117659873dbb8fc6044a3d03a0c81fc7d1479` |
| NestJS BFF | `<workspace>/ysl-ltd/yourstorieslive-api` | `pixeltrendanalytics-devs/yourstorieslive-api` | `codex/aws-media-poc` | `4e064f839a2be01544c0c0b77e53164a4c5e551e` |

The old frontend POC source is `a6e75eba976fbc6beb1cdefab07b391e1e1c218b`,
with shared ancestor `ceb54dbc8a208b39a1982a86a8fa79e58daaa99b`. The old BFF POC
source is `a695a27f9f7ec6a3d17224cd547d493d0fbc2979`, with shared ancestor
`d202dbf487376168eab85d7081d0008c77b15241`. A squash merge onto each new feature
branch carries the POC difference without copying newer main files backwards.

Transferred frontend commit: `5fd12365cf178b93ecbd747359efd1d51c02327f`.
Transferred BFF commits: `d33b7b6ae3a9f348173e2bbe7f21ead049b5f3d4` and
`e13bb1e1ad8ed5cce96ef4f6450a4455695ae45d` (offline CI region correction).
Both feature branches have been pushed to their new origins.

The frontend conflict resolution preserves the latest photo request sections
and visitor photo detail queries while adding UUID media-library routing. The
BFF retains the latest `sanitize-html` override alongside the POC's `sharp`,
AWS SDK, and CDK dependencies. Parity tooling and mobile were not modified.

## Deployment controls

Every AWS job requires all of these:

1. The exact new repository.
2. `github.ref == 'refs/heads/codex/aws-media-poc'`.
3. Repository variable `AWS_POC_ENABLED` exactly `true`.
4. The separate `aws-poc` environment, restricted to this feature branch.

`AWS_POC_ENABLED` is `false` in both repositories during the transfer. AWS
deploy, registry/bootstrap, lifecycle, and destroy jobs therefore remain
disabled. Feature validation workflows still run lint, type checks, full tests,
and builds on GitHub without assuming AWS roles. Existing main CI and Vercel
deployment settings are preserved; Vercel's frontend config still enables only
main deployments.

Environment variables and secrets are not copied from old GitHub repositories
or local `.env` files. Configure future AWS values inside the new `aws-poc`
environments. Set `AWS_DEPLOY_ROLE_ARN` for BFF workflows and
`FRONTEND_AWS_DEPLOY_ROLE_ARN` for frontend workflows after the new deployment
identities exist. Keep the enable switch at repository level: the job's `if`
condition must evaluate it before entering its environment.

The verified immutable OIDC subjects are:

```text
repo:pixeltrendanalytics-devs@337259770/yourstorieslive@1405892240:environment:aws-poc
repo:pixeltrendanalytics-devs@337259770/yourstorieslive-api@1405894086:environment:aws-poc
```

GitHub's OIDC configuration API confirmed both subject prefixes. The templates
use these new identities; the environment's branch restriction provides the
branch boundary for environment-based OIDC subjects. See the
[GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc).

## Working on these branches

Use these new clones for future POC changes. Preserve the old clones as reference.
Fetch the latest upstream code and merge/rebase it onto the feature branch;
never merge the POC into main or push to main. Push explicitly to the feature:

```bash
git push origin HEAD:refs/heads/codex/aws-media-poc
```

After a branch workflow has been registered by its first push, use GitHub CLI
for manual runs on the explicit feature ref. The web UI's Run workflow button
may be absent while its file is absent from main. Do not add a workflow to main
to make that button appear. See
[GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

Validation is safe to run while AWS is disabled:

```bash
gh workflow run validate-aws-poc.yaml \
  --repo pixeltrendanalytics-devs/yourstorieslive \
  --ref codex/aws-media-poc
gh workflow run validate-aws-poc.yaml \
  --repo pixeltrendanalytics-devs/yourstorieslive-api \
  --ref codex/aws-media-poc
```

When a later request authorizes bringing AWS back, provision the prerequisites,
configure new deployment roles/runtime secrets, and then enable AWS jobs:

```bash
gh variable set AWS_POC_ENABLED --body true \
  --repo pixeltrendanalytics-devs/yourstorieslive
gh variable set AWS_POC_ENABLED --body true \
  --repo pixeltrendanalytics-devs/yourstorieslive-api
```

Deploy BFF first, then frontend, using `--ref codex/aws-media-poc` on every
dispatch. These commands are for the future; AWS remains disabled for this
code transfer. Pause/resume workflows retain their existing ECS/RDS behavior.
The destroy workflow still requires `confirmation=destroy-development-bff`.

## Limitations carried from the POC

This is a code transfer, not a redesign of the media worker. The embedded
thumbnail worker and the previously observed batch-upload memory risk remain.
The AWS media transcription limitation remains too. Newly added PHP photo
requests/comment controls continue using their established compatibility APIs;
they are not automatically converted into AWS sharing or moderation features.

Local verification uses focused media/session tests only. Full test suites run
on the new feature branches in GitHub. No live AWS test or deployment is part
of this transfer.

Local type checks, lint, production builds, BFF dependency checks, 99 selected
frontend tests, and 30 selected BFF tests passed. Seven AWS job guards and 42
workflow shell steps were checked. The CI-only CDK region fallback was corrected
by setting the AWS region explicitly and using `--no-lookups`; the same synthesis
passed with local AWS credential files disabled.

All seven AWS deployment/lifecycle jobs were confirmed skipped on the transfer
push. Full-suite validation runs are recorded here:

- [Frontend validation](https://github.com/pixeltrendanalytics-devs/yourstorieslive/actions/runs/37960733465): passed; 424 suites and 5,178 tests; production build passed.
- [BFF validation](https://github.com/pixeltrendanalytics-devs/yourstorieslive-api/actions/runs/37961285813): passed; 73 suites and 1,636 tests; production build and offline synthesis passed.

Final remote verification confirmed both main SHAs still match the transfer
baseline above. Both new feature worktrees are clean and track their own feature
branches. The old POC branch SHAs and clean worktrees were also verified intact.

