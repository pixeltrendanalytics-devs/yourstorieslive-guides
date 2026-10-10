# AWS development deployment guide

This guide explains how the development BFF moves from a GitHub push to the
running AWS endpoint. It is intentionally written for developers who are new
to AWS terminology.

## What is deployed

```text
Developer push
      |
      v
GitHub Actions
      |
      | OIDC: temporary AWS credentials
      v
Amazon ECR <--- Docker image tagged with the Git commit SHA
      |
      v
Amazon ECS service on AWS Fargate
      |
      v
Application Load Balancer
      |
      v
Public BFF URL

The running BFF also connects to:

- Amazon RDS for PostgreSQL for application metadata
- Amazon S3 for private media objects
- Amazon SQS for future asynchronous media processing
- AWS Secrets Manager for runtime credentials
- Amazon CloudWatch for logs, metrics, and alarms
```

## The names in plain language

### GitHub Actions

GitHub Actions is the automation runner. A workflow checks out the repository,
runs the checks, builds the Docker image, pushes it to AWS, and asks AWS to run
the new version.

The workflows are under `.github/workflows/`.

### OIDC

OIDC means OpenID Connect. In this setup it lets GitHub prove to AWS which
repository and GitHub environment started a workflow.

The authentication sequence is:

1. The workflow has `id-token: write` permission.
2. GitHub issues a short-lived signed identity token for that workflow job.
3. `aws-actions/configure-aws-credentials` presents the token to AWS STS.
4. AWS verifies that the token matches the repository and `development`
   environment trusted by the IAM deployment role.
5. AWS returns temporary credentials that expire after the job.

No permanent AWS access key is stored in the repository or GitHub Secrets.
`AWS_DEPLOY_ROLE_ARN` identifies the role the workflow is allowed to assume; it
is not an AWS password.

### IAM and STS

IAM controls permissions. The GitHub deployment role is an IAM role with the
minimum permissions needed to push an image and invoke the CDK deployment.

STS is the AWS service that issues the temporary credentials after OIDC has
authenticated the workflow.

### ECR

ECR means Elastic Container Registry. It stores Docker images. It does not run
the application.

Each deployment pushes an immutable image tag equal to `GITHUB_SHA`, for
example:

```text
<account>.dkr.ecr.ap-southeast-1.amazonaws.com/ysl-bff:<git-commit-sha>
```

Using a commit SHA means AWS can identify exactly which source revision is
running and can roll back to a previous image.

### ECS and Fargate

ECS means Elastic Container Service. It maintains the desired number of BFF
tasks and replaces failed tasks.

Fargate is the compute capacity used by ECS. It runs the container without us
managing an EC2 virtual machine. The development service currently requests one
small task with 0.25 vCPU and 512 MiB of memory.

There is no AWS service named `ECE` in this architecture. The similar names
normally meant here are ECR, which stores images, and ECS, which runs them.

### Task definition and ECS service

An ECS task definition is a versioned run specification: image tag, CPU,
memory, port, environment configuration, secrets, logging, and permissions.

The ECS service points at one task-definition revision. During a normal
deployment it starts the new revision, waits for it to become healthy, and then
stops the old task.

### CDK and CloudFormation

CDK means Cloud Development Kit. The TypeScript files under `infra/` describe
the AWS resources in code.

CDK does not create resources directly. It synthesizes the TypeScript into an
AWS CloudFormation template. CloudFormation compares that template with the
deployed stack and updates only resources whose definitions changed.

For a normal BFF code change, the image tag changes. The expected AWS change is
therefore:

```text
new ECS task-definition revision
              |
              v
rolling update of the ECS service
```

RDS, S3, SQS, the VPC, and the load balancer are not recreated for a code-only
deployment.

### Application Load Balancer

The current endpoint is:

```text
http://yslbff-bffse-ocgoqyzzbaap-714487514.ap-southeast-1.elb.amazonaws.com
```

Yes, this is the AWS-generated DNS name of the Application Load Balancer. The
request flow is:

```text
Browser -> load balancer listener -> target group -> healthy ECS task -> NestJS
```

The load balancer spans two availability zones and exposes public IP addresses.
The ECS task can be replaced without changing this load-balancer hostname.

The current development endpoint is HTTP because no custom DNS name and ACM
certificate are configured. A future HTTPS frontend cannot call this HTTP URL
without browser mixed-content errors. Before an HTTPS frontend uses this BFF,
configure a domain, an ACM certificate, and an HTTPS listener.

The infrastructure already supports that switch. See
[`aws-acm-https-guide.md`](aws-acm-https-guide.md) for the certificate, DNS,
GitHub variable, deployment, and verification steps.

### RDS, S3, and SQS

- RDS is the standalone PostgreSQL database. It will store the new platform's
  metadata, ownership, relationships, and media records.
- S3 stores the actual media bytes as private objects. The browser must never
  receive general AWS credentials; the BFF will issue short-lived,
  user-scoped upload and download URLs.
- SQS is a queue. It will hold asynchronous jobs such as thumbnail generation,
  metadata extraction, or media processing. Creating a queue does not process
  anything by itself; a worker is still required.

## What happens after a normal BFF push

The application workflow is `deploy-bff-dev.yaml`.

1. A relevant change on `codex/media-platform-aws` triggers the workflow.
2. Lint, type checking, tests, dependency checks, and the NestJS build run.
3. Docker Buildx creates a Linux AMD64 image.
4. The image is pushed to ECR using the Git commit SHA as its tag.
5. CDK deploys only `YslBffDevStack` with `--exclusively`.
6. CloudFormation applies the resource-level difference.
7. ECS performs the rolling application update.
8. The workflow calls `/api/health` through the load balancer.

The workflow no longer deploys the ECR repository or GitHub OIDC identity on
every application change.

## When the registry workflow runs

The separate `deploy-bff-registry.yaml` workflow owns:

- the ECR repository;
- the GitHub OIDC provider reference; and
- the IAM deployment role.

It runs only when its own workflow, `infra/bff-registry-stack.ts`, or shared CDK
wiring that can affect it changes. It can also be started manually. Its CDK
command exclusively deploys `YslBffRegistryStack`.

This separation prevents routine NestJS changes from updating deployment
identity infrastructure.

## Local frontend using the AWS BFF

The localhost frontend points `NEXT_PUBLIC_BFF_API_URL` at the load-balancer
URL. The browser then calls the AWS BFF directly:

```text
Next.js on http://localhost:3000
              |
              v
AWS load balancer -> NestJS BFF
```

The BFF CORS configuration must contain `http://localhost:3000`. No AWS
credentials, database connection, or S3 credentials belong in the frontend.

## Current application implementation status

The first standalone media-library slice is implemented on the feature
branches:

- The BFF owns new `/api/v1/media-library/**` APIs backed by standalone RDS
  PostgreSQL records and private S3 objects.
- Ownership is taken from the authenticated BFF request context; callers do not
  submit an arbitrary user ID.
- Upload is reservation -> signed S3 PUT -> completion/verification.
- List, grouping, filters, owner-scoped detail, signed content access,
  annotations, deletion impact, and deletion are available.
- The frontend Photos page calls the new API and signed upload URL.
- Existing `/api/v1/media-assets/**` PHP compatibility APIs remain in place
  and are not modified.
- New story/contact/share relationships, social ingestion, processing workers,
  and existing-user migration remain later slices. The frontend does not send
  a new media UUID to the legacy relationship APIs.

For inspecting standalone records without exposing RDS publicly, see
[`aws-rds-record-access-guide.md`](aws-rds-record-access-guide.md).

## How to verify a deployment

1. Open the `Deploy Development BFF` GitHub Actions run.
2. Confirm checks, image publishing, CDK deployment, and health verification
   are green.
3. Open the deployment output artifact to find the BFF URL.
4. Check the health endpoint:

   ```bash
   curl --fail \
     http://yslbff-bffse-ocgoqyzzbaap-714487514.ap-southeast-1.elb.amazonaws.com/api/health
   ```

5. In ECS, confirm the service uses the task-definition revision containing the
   expected Git commit SHA image.

## Cost controls

The manual management workflow can set the ECS desired count to zero and stop
RDS. This reduces compute cost, but the load balancer, public IPv4 addresses,
database storage, and secrets continue to cost money. RDS also restarts itself
after seven stopped days.

Destroying `YslBffDevStack` removes almost all runtime cost, but the current
development removal policies also delete the RDS database and S3 objects. Treat
destroy as data-destructive.

