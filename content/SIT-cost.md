## Current SIT estimate — 5 October 2026

CloudFront and the Next.js ECS service have now been deployed. The frontend
uses one 1-vCPU / 2-GiB Fargate task, in addition to the existing BFF task. The
CloudFront hostname is
[`https://d1hzshzjegws8c.cloudfront.net`](https://d1hzshzjegws8c.cloudfront.net).
The BFF workflow was dispatched after CloudFront provisioning so its
frontend-origin/CORS configuration can use this hostname; confirm that run has
completed before testing the full browser-to-BFF flow.

The estimate below assumes the BFF and frontend each run one task continuously
for an average month (about 730 hours), RDS is running, and current low SIT
usage. It is an estimate, not a live bill; region, usage, backup retention,
AWS credits, and taxes can change the result.

If RDS is still stopped, reduce the always-on estimate by roughly $18/month
while it remains stopped; its allocated storage and backups still incur costs.

| Period            | Estimated AWS cost, excluding CloudFront overage |
| ----------------- | ------------------------------------------------: |
| Per day           |                                  **about $3.75** |
| Per week          |                                    **about $26** |
| Per average month |                                  **about $112–114** |

### Monthly baseline breakdown

| Resource                                  |                 Estimate |
| ----------------------------------------- | -----------------------: |
| ECS Fargate — BFF, 0.25 vCPU / 512 MB    |                  $11.25 |
| ECS Fargate — frontend, 1 vCPU / 2 GiB   |                  ~$45.00 |
| Application Load Balancer                 |                  $18.40 |
| Four public IPv4 addresses                |                  $14.60 |
| RDS PostgreSQL `db.t4g.micro`              |                  $18.25 |
| RDS 20 GB gp3 storage                     |                   $2.76 |
| Four Secrets Manager secrets              |                   $1.60 |
| CloudWatch alarms/logs                    |               ~$0.20–$0.50 |
| S3, SQS, and ECR at current low usage     |                 < $0.25 |
| CloudFront at low SIT usage                | Often $0 within allowance |
| **Estimated always-on total**             |             **~$112–114/month** |

The IPv4 estimate counts two ALB addresses plus one public IP for each running
Fargate task. Stopping both ECS services releases the task IPs, but not the
ALB addresses. Fargate charges are proportional to task runtime; the frontend
task adds about $45/month when it runs continuously. See [AWS Fargate
pricing](https://aws.amazon.com/fargate/pricing/).

### CloudFront and media traffic

The distribution has no separate hourly charge. AWS currently lists a monthly
free allowance of 1 TB of viewer data transfer and 10 million HTTP(S) requests
for CloudFront pay-as-you-go. If SIT stays within the allowance, CloudFront
may add no charge; above it, delivery and request costs depend on viewer
geography. For the next transfer tier, listed rates include $0.085/GB in the
US/Canada, $0.120/GB in Singapore and South Korea, and $0.109/GB in India;
HTTPS requests are $0.012 per 10,000 in those Asian regions. AWS-to-CloudFront
origin fetches from AWS origins such as the ALB are free. Large
viewer-originated POST/PUT request bodies can have separate
CloudFront-to-origin transfer charges, so avoid routing media bytes through
`/api/*` when the upload flow can send them directly to S3. The distribution
uses Price Class 200, which includes the US, Korea, India, and Singapore.
Check the [CloudFront pay-as-you-go pricing
page](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/) and the
account bill for actual usage and current Free Tier eligibility.

Only immutable `/_next/static/*` assets are cached in this setup; pages, APIs,
and signed/private media are not edge-cached. CloudFront provides a global
HTTPS entry point and accelerates the cacheable build assets, but does not
eliminate Next.js image-optimizer work or make private gallery media public.

## Original BFF-only estimate

Before adding the frontend task, the estimated initial SIT setup was:

| Period            | Estimated AWS cost |
| ----------------- | -----------------: |
| Per day           |        **US$2.10** |
| Per week          |       **US$14.70** |
| Per average month |       **US$63–65** |

This excludes taxes, AWS credits/free-tier benefits, significant media storage, downloads, and future media-processing workers.

### Original BFF-only monthly breakdown

| Resource                         |                       Estimate |
| -------------------------------- | -----------------------------: |
| ECS Fargate: 0.25 vCPU / 512 MB  |                         $11.25 |
| Application Load Balancer        |                         $18.40 |
| Three public IPv4 addresses      |                         $10.95 |
| RDS PostgreSQL `db.t4g.micro`    |                         $18.25 |
| RDS 20 GB gp3 storage            |                          $2.76 |
| Four Secrets Manager secrets     |                          $1.60 |
| CloudWatch alarms/logs           |                   ~$0.20–$0.50 |
| S3, SQS and ECR at current usage |                Less than $0.25 |
| **BFF-only total**               | **Approximately $63–65/month** |

The original estimate uses Singapore rates retrieved from the AWS Price List
API. The current always-on estimate adds one 1-vCPU / 2-GiB frontend task
(about $45/month) and one public IPv4 address (about $3.65/month at $0.005 per
hour). ALB has hourly and LCU charges. See [ALB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/),
[public IPv4 pricing](https://aws.amazon.com/vpc/pricing/), and [RDS
PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/).

Media storage will add approximately:

- 100 GB in S3 Standard: **$2.50/month**
- 1 TB in S3 Standard: **$25.60/month**
- Uploads into S3 are free for bandwidth, but requests and subsequent downloads can add cost. [S3 pricing](https://aws.amazon.com/s3/pricing/)
- SQS should remain within its one-million-request monthly free tier during early development. [SQS pricing](https://aws.amazon.com/sqs/pricing/)

### Pausing versus destroying

Use `Manage Development BFF Cost` and `Manage Development Frontend Cost` on
`codex/media-platform-aws` to pause both services and stop RDS:

- ECS becomes zero tasks.
- RDS is stopped.
- CloudFront remains deployed. It has no separate hourly fee, but viewer
  requests and transfer can still incur charges beyond the applicable
  allowance.
- ALB, its two IPv4 addresses, stopped RDS storage/backups, S3/ECR data,
  secrets, and applicable monitoring costs remain.

With both ECS services at zero and RDS stopped, the earlier baseline is still
about **$1/day, $7/week, or $30/month**, before CloudFront overage and changing
storage/log usage. RDS automatically restarts a stopped instance after seven
days, so stopping it is not an indefinite shutdown. [AWS RDS stop
behavior](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_StopDBInstance.html)

For full teardown, delete `YslFrontendDevStack` first because it depends on the
BFF stack's ALB and VPC; then delete `YslBffDevStack`. Deleting the frontend
stack also removes CloudFront. The current BFF CDK removal policies
permanently delete the development RDS database and S3 objects. If the BFF
stack is destroyed while frontend ECR/CDK storage is retained, residual
storage costs may remain; verify actual resources and billing before assuming
costs are zero.

### Targeted BFF deployments

I updated the local feature branch so normal BFF pushes no longer deploy the registry or deployment-identity stack:

- [deploy-bff-dev.yaml](<workspace>/yourstories-live-api-fork/.github/workflows/deploy-bff-dev.yaml)
- [deploy-bff-registry.yaml](<workspace>/yourstories-live-api-fork/.github/workflows/deploy-bff-registry.yaml)
- [package.json](<workspace>/yourstories-live-api-fork/package.json)

The resulting behavior is:

1. A normal BFF code push builds and publishes one immutable image.
2. CDK exclusively deploys `YslBffDevStack`.
3. For a code-only change, CloudFormation creates a new ECS task-definition revision and performs a rolling ECS deployment.
4. RDS, S3, SQS, ALB and networking remain unchanged.
5. ECR/OIDC registry infrastructure has its own path-filtered workflow and is deployed exclusively.

ECS replaces the old task only after starting the task with the new revision. [AWS ECS rolling update behavior](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_UpdateService.html)

Validation passed for formatting, lint, TypeScript, infrastructure TypeScript, dependency cycles, CDK synthesis, and all 1,424 tests. The repository’s existing `db:verify` script references absent files, and its existing spell check reports unrelated historical issues.

The BFF deployment workflow limits normal BFF code changes to its service
stack; registry/deployment-identity infrastructure has a separate workflow.
See the [frontend ECS deployment guide](aws-nextjs-ecs-development-guide.md)
for CloudFront routing, deployment, pause/resume, and teardown details.

