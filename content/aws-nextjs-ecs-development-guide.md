# Next.js on AWS ECS — development deployment

The frontend lives in `<workspace>/yourstorieslive`, on
`codex/media-platform-aws`. The deployment is designed to run as `ysl-frontend-dev` in the existing
`ysl-bff-dev-cluster`. Infrastructure is defined in the frontend repository's
`infra/frontend-registry.yaml` and `infra/frontend-service.yaml`.

## Deployment status — 5 October 2026

The frontend registry and branch-restricted GitHub deployment role were
provisioned successfully. The BFF deployment adding the frontend origin to
BFF and S3 CORS also succeeded.

The frontend currently runs through the ALB at:
http://yslbff-bffse-ocgoqyzzbaap-714487514.ap-southeast-1.elb.amazonaws.com:8080/sign-in

CloudFront is being added in front of that existing ALB. Once deployed, use
the `FrontendUrl` output from `YslFrontendDevStack`
(`https://<distribution-id>.cloudfront.net`). The ALB remains the origin; no
new ECS service or load balancer is introduced.

The CloudFront implementation is pushed to the frontend and BFF feature
branches, but is not deployed yet. The frontend deployment stopped at its
existing full Jest gate (3 failed suites / 3 failed tests); it never assumed
AWS credentials or changed frontend AWS resources. Resolve those test failures
and rerun the feature-branch frontend workflow. Then rerun the BFF workflow so
its CORS, S3 CORS, and OAuth return URL include the created CloudFront origin.

Earlier failing tests were updated to match the standalone media API contracts,
asynchronous social authorization, and manual transcript limitation. Targeted
tests were run locally; GitHub passed all 365 suites / 4,583 tests, lint, and
typecheck. GitHub built the Linux image, published it to ECR, and deployed it
to ECS. The sign-in page was checked in the browser, BFF health returned 200,
API CORS returned 204, and S3 upload preflights passed for hosted and localhost
origins. Authenticated uploads and social flows still need manual verification.

Frontend run: https://github.com/mk-tdev/yourstorieslive/actions/runs/37183932155

BFF CORS run: https://github.com/mk-tdev/yourstories-live-api/actions/runs/37184185202

## Request flow

```text
Browser --HTTPS--> CloudFront --HTTP :8080--> existing ALB → Next.js :3000
Browser --HTTPS--> CloudFront --HTTP :80----> existing ALB → NestJS BFF :3001
                                                               → RDS / S3
```

CloudFront gives the browser a global HTTPS endpoint (PriceClass 200 includes
the US, Korea, India, and other Asia/Europe edge locations) and keeps the
existing ALB as the origin. Its generated hostname requires no DNS or ACM
setup. Edge-to-origin hops are still HTTP to the public ALB; configure an ALB
certificate and HTTPS origins before treating this as a production security
boundary.

CloudFront routes `/api/*` to the BFF listener (ALB port 80) and all other
paths to Next.js (port 8080). This makes browser API calls same-origin HTTPS
and avoids mixed-content blocking. Next.js remains the UI server; no Next.js
API handlers are added. API methods, query parameters, authorization headers,
and cookies are forwarded, and API responses are never edge-cached.

Only immutable `/_next/static/*` build assets use AWS's optimized cache policy.
Pages, public artwork, locale/auth routes, `/_next/image`, API requests, and
signed/private media remain uncached. In particular this does not cache private
gallery media or Next's image-optimizer output: CloudFront improves delivery of
hashed JS/CSS/fonts and provides HTTPS, but does not remove the first
image-optimizer conversion cost. CloudFront is pay-as-you-go; request and
viewer-to-edge transfer charges may apply.

There is one extra Fargate task and one extra target group, with no new ALB,
VPC, ECS cluster, database, or NAT gateway. The frontend task has no access to
RDS, S3 credentials, or BFF secrets. It accepts port 3000 only from the ALB.
One task with 1 vCPU and 2 GiB RAM is the development configuration, increased
from 0.25 vCPU / 512 MiB on 4 October 2026 to address slow on-demand image
conversion. Fargate requires at least 2 GiB for 1 vCPU. This quadruples the
frontend task's CPU and memory billing components while running; it does not
quadruple the entire setup's cost. BFF, RDS, ALB and S3 are unchanged. The
`pause` action still stops frontend task compute billing. More CPU reduces
conversion pressure but does not remove cold image conversions or replace a CDN.
The frontend repository's service template is authoritative for deployments;
the BFF bootstrap reference copy still has the initial smaller task size and
must not be used to deploy the service directly.

Capacity deployment succeeded:
https://github.com/mk-tdev/yourstorieslive/actions/runs/37185379750
All 365 suites / 4,583 tests passed in GitHub. The same public sign-in artwork
was measured before and after resizing, with `x-nextjs-cache: MISS` confirming
cold requests: AVIF at width 1440 went from 5.36 s to 1.26 s; AVIF at width
1080 / quality 70 went from 4.05 s to 1.03 s; WebP at the same width/quality
went from 1.67 s to 0.31 s. These are single-request measurements, not a load
test or an authenticated gallery benchmark. Browser/network conditions and
concurrent conversions still affect the result.
The existing ALB security group has restricted outbound traffic, so the
frontend stack adds a narrow outbound rule to the frontend task security group
on port 3000. Without this rule, ALB health checks time out and ECS rolls back.

## One-time setup

Run `Bootstrap Development Frontend Registry` in the BFF fork on this feature
branch. It uses the existing GitHub OIDC identity and CDK provisioning roles to
deploy `YslFrontendRegistryStack` with the registry template,
`CAPABILITY_NAMED_IAM`, the existing GitHub OIDC provider ARN,
and the exact frontend repository/feature-branch OIDC subject. That stack owns
the `ysl-frontend-dev` ECR repository and `ysl-frontend-dev-github` role.
Set `FRONTEND_AWS_DEPLOY_ROLE_ARN` in the frontend repository's Actions variables
to the stack's `DeploymentRoleArn` output.

Bootstrap copies of the two templates are kept under the BFF fork's
`infra/bootstrap/` because the frontend repository is private and the BFF
workflow cannot check it out using its own repository token. Keep those copies
in sync when changing registry permissions or bootstrap validation. Routine
frontend service deployments always read the frontend repository's own template.
Local AWS login is not required for GitHub deployments; use `aws login` only
for direct operator inspection or teardown.

The OIDC subject must be resolved from the repository's GitHub settings. For
its current default subject format, it is:
`repo:mk-tdev/yourstorieslive:ref:refs/heads/codex/media-platform-aws`.
No static AWS access key belongs in GitHub. The trust policy accepts only this
branch. Changing the repository's OIDC subject format requires updating trust.

## Build and deployment

`Deploy Development Frontend` runs on relevant pushes to
`codex/media-platform-aws`, or by manual dispatch on that branch. Both jobs and
AWS trust reject other branches. Before publishing, GitHub runs lint,
typecheck, and the full Jest suite. PR coverage enforcement stays in the
existing CI workflow. No full suite or Docker build is required on the Mac.

The workflow reads the existing BFF stack's outputs to discover the ALB and
cluster, then first deploys the frontend stack with its current image to
create/update CloudFront. It reads the resulting HTTPS hostname and uses it for
`NEXT_PUBLIC_SITE_URL` and the base of `NEXT_PUBLIC_BFF_API_URL`; CloudFront
routes the latter's `/api/*` calls to the BFF. GitHub then builds
`Dockerfile.aws` for `linux/amd64`, publishes an image tagged with the Git
commit SHA, and smoke-tests `/sign-in` inside that image. It deploys the new
image to `YslFrontendDevStack` and verifies the HTTPS CloudFront URL.
The original release Dockerfile and release workflow retain their existing
behavior; AWS uses a separate Dockerfile with standard Next.js standalone
configuration, without modifying generated `server.js`.

The public configuration is mounted during Docker build using a BuildKit secret.
It is not copied into a runtime `.env` file. `NEXT_PUBLIC_*` values are public
browser configuration and are still compiled into the browser bundle. Never
put a database password, provider secret, private AWS key, or BFF JWT secret
in these values. Rebuild with a new commit when changing build configuration;
rerunning a commit reuses its existing immutable image.

The workflow derives `NEXT_PUBLIC_BFF_API_URL` and `NEXT_PUBLIC_SITE_URL` from
AWS. Optional repository Actions variables match `.env.example`: browser Maps
key, translation URL, legacy media read origin/folder, cookie names, and the
mobile navigation flag. Local `.env` files are excluded from the AWS build
context. Maps requires a browser key whose referrer restrictions permit the
development origin.

The BFF workflow discovers the ALB and CloudFront origins, adds them to BFF and
S3 CORS, and sets `FRONTEND_URL` to the CloudFront HTTPS origin for social
provider return redirects. Keep localhost allowed for local development. The
BFF must be deployed once after CloudFront is created so its CORS and S3 CORS
include the generated HTTPS origin. Frontend deployment alone does not update
the BFF; run `Deploy Development BFF` after the first CloudFront deployment.
No wildcard access or public bucket policy is required.
Social provider popup callbacks currently still
use the BFF's configured `APP_ORIGIN`/`FRONTEND_URL`; hosted social flows require
that configuration and provider redirect URLs to match. This is separate from
ordinary username/password sign-in and AWS uploads.

## HTTPS, custom DNS, and development limitations

The browser URL is HTTPS on CloudFront's generated hostname. CloudFront
redirects viewer HTTP to HTTPS, so browser camera/microphone recording can use
the secure context. The origin ALB listeners remain HTTP; for end-to-end TLS,
add an ALB certificate and point CloudFront origins to HTTPS. For a custom
frontend hostname, request/validate an ACM certificate in `us-east-1`
(CloudFront's required certificate region), associate it with the distribution,
then point DNS at the distribution. This differs from the regional ACM
certificate used by the BFF ALB.

## Pause, resume, rollback, teardown

Run `Manage Development Frontend Cost` on this feature branch with `pause` to
set its desired count to zero, or `resume` to restore one task. Deployments
preserve a paused count from an ACTIVE service; a deleted/inactive service does
not cause a fresh deployment to start paused. The default `inspect` action
reads stack events and ECS status without changing resources. Pushes changing
this management workflow run inspection only.
The BFF pause workflow continues to control the BFF
and RDS separately. ALB, ECR storage, logs, and database/storage charges remain
when frontend tasks are stopped.

To roll back, revert the frontend commit on this branch and push it; a fresh
image is built for that reverted state. ECS deployment failure rollback is
enabled, and the workflow checks the active task image so an automatic
rollback cannot be mistaken for successful deployment of the requested SHA.
An initial stack left in `ROLLBACK_COMPLETE` is an empty failed deployment
shell: the deployment workflow deletes that frontend-only shell and recreates
it. The management workflow also has a guarded `reset-initial` recovery action
for a first deployment still in `CREATE_IN_PROGRESS` with no completed ECS
deployment. It checks resource types before deleting only the frontend stack;
it refuses to reset an established service or a stack owning data resources.

For complete frontend teardown, delete `YslFrontendDevStack` first and wait for
completion. It removes the frontend service, listener, ingress rule, target
group, logs, and task roles. Delete its ECR images before deleting
`YslFrontendRegistryStack`. The registry is intentionally not automatically
emptied, preserving images until explicit deletion. Delete the frontend stack
before destroying the BFF stack because it uses the BFF's ALB and network.

Full stack deletion requires a currently authenticated AWS operator. The
deployment workflow never deletes the BFF stack or any production resources.

