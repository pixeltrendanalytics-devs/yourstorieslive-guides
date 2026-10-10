# AWS services in the YourStoriesLive development setup

This is a compact inventory of AWS services used by the current development/SIT architecture, based on the BFF and frontend infrastructure definitions. It explains each service's role and how it is wired into this application. This is not a claim that every service is currently running: ECS desired counts and the RDS instance can be paused for cost savings.

## Request and deployment flow

```text
Developer push
  └─ GitHub Actions ── GitHub OIDC / AWS STS ── IAM deployment role
       ├─ builds image ── Amazon ECR
       └─ deploys ── AWS CloudFormation (templates authored with AWS CDK)

Browser ── HTTPS ── Amazon CloudFront
                      ├─ default + Next assets ── public ALB :8080 ── ECS/Fargate frontend :3000
                      └─ /api/* ──────────────── public ALB :80 ──── ECS/Fargate BFF :3001
                                                                         ├─ RDS PostgreSQL (private)
                                                                         ├─ private S3 media bucket
                                                                         └─ SQS processing queue → DLQ
```

CloudFront's generated domain provides browser-facing HTTPS. Its origins are the shared ALB listeners over HTTP in the current development configuration. The ALB is public and spans two Availability Zones; RDS is in isolated private subnets. ECS tasks currently use public subnets and public IP assignment. The frontend task security group only accepts its application port from the ALB security group.

## Services used

| AWS service | Why it is here | How this application uses it |
|---|---|---|
| **Amazon CloudFront** | Global edge entry point, HTTPS for the generated hostname, and delivery/caching for frontend assets. | Default behavior and `/_next/static/*` go to the frontend ALB listener on port 8080. `/api/*` goes to the BFF listener on port 80. Price Class 200 is configured for broad coverage including Asia-Pacific regions. |
| **Elastic Load Balancing — Application Load Balancer (ALB)** | Stable public origin and Layer-7 routing to healthy application targets; ECS tasks can be replaced without changing the origin hostname. | One shared ALB serves the BFF on port 80 and frontend on port 8080, each through its own target group/health check. CloudFront forwards to these listeners. |
| **Amazon ECS** | Schedules and maintains containerized frontend and BFF services. | The BFF runs in the `ysl-bff-dev-cluster`; the Next.js service shares that cluster. Desired counts can be set to zero while paused. |
| **AWS Fargate** | Runs ECS containers without managing EC2 hosts. | BFF task is configured at 0.25 vCPU / 512 MiB; frontend task at 1 vCPU / 2 GiB. They are registered behind the ALB. |
| **Amazon ECR** | Private container-image registry. | Separate BFF and frontend repositories store immutable/tagged application images; image scanning on push and a keep-latest-images lifecycle policy are configured. ECS pulls the selected image when deploying. |
| **Amazon RDS for PostgreSQL** | Durable relational store for the new application-owned records, separate from the legacy PHP database. | BFF connects privately to PostgreSQL in isolated subnets. Current dev settings: PostgreSQL 16, `db.t4g.micro`, 20 GiB gp3 with autoscaling up to 100 GiB, encrypted, Single-AZ, one-day automated backup retention. |
| **Amazon S3** | Object storage for media bytes; avoids storing large files in PostgreSQL or app containers. | Private bucket with public access blocked, SSL enforced, S3-managed encryption, browser CORS for direct signed PUT/GET, and incomplete multipart-upload cleanup. BFF authorizes ownership and issues short-lived presigned URLs. |
| **Amazon SQS** | Durable buffer for work that should run asynchronously rather than in an API request. | A media-processing queue and dead-letter queue (DLQ) are provisioned. Queue permissions are granted to the BFF task. A queue alone does not perform processing; a worker must consume jobs for that behavior to be active. |
| **AWS Secrets Manager** | Keeps application credentials out of source code and container images. | Stores generated RDS credentials plus BFF JWT, legacy API client, and social-import secrets. ECS injects selected secret values when starting the BFF task. |
| **AWS Identity and Access Management (IAM)** | Defines who/services may perform which AWS actions. | Separate ECS task/execution and GitHub deployment roles provide image-pull, logging, S3, SQS, secret-read, and deployment permissions. Access is scoped by role policies where configured. |
| **AWS Security Token Service (STS)** | Issues short-lived AWS credentials after trusted identity federation. | GitHub Actions exchanges its OIDC token for temporary credentials by assuming a branch/environment-restricted IAM deployment role; no long-lived AWS key is required in GitHub. |
| **IAM OIDC identity provider** | Establishes GitHub Actions as a federated identity issuer AWS can trust. | The provider trusts `token.actions.githubusercontent.com`; IAM role conditions restrict which repository/environment subject may deploy. This is an IAM feature/resource, not a separate compute service. |
| **Amazon CloudWatch** | Central place for application logs, service metrics, and alarms. | ECS sends BFF and frontend container logs to log groups (seven-day retention); PostgreSQL logs are exported. BFF CPU and unhealthy-target alarms are defined; ECS Container Insights is enabled for the BFF cluster. |
| **Amazon Virtual Private Cloud (VPC)** | Provides network boundaries, subnets, routing, and security groups. | Two Availability Zones; public application subnets and isolated private database subnets; no NAT Gateway. ALB/tasks use the application network, while RDS has no public endpoint and accepts PostgreSQL from the BFF service. |
| **Public IPv4 addresses / Internet Gateway** | Public connectivity for the internet-facing ALB and, in the present low-cost design, outbound/internet networking for Fargate tasks. | ALB uses public addresses across its enabled AZs. Each running Fargate task configured with `AssignPublicIp` can also receive a public IPv4. Task addresses are replaceable; they are not stable service endpoints. No NAT Gateway is provisioned. |
| **AWS Key Management Service (KMS), AWS-managed keys** | Underlying key management for encrypted AWS storage. | RDS storage encryption and AWS-managed S3/SQS encryption are enabled. No customer-managed KMS key is explicitly configured in the current stack. |
| **AWS Systems Manager message channels (ECS Exec support)** | Secure operational access to a running container for troubleshooting. | ECS Exec is enabled on the BFF service and its task role has `ssmmessages` channel permissions. It is an operator feature, not part of normal browser/API traffic. |
| **AWS CloudFormation** | Applies, tracks, and updates infrastructure as versioned stacks. | CDK-generated BFF and frontend templates create/update resources. A code-only deployment is intended to update the image/task definition and ECS service without replacing RDS, S3, networking, or ALB. |

## Tools and concepts that are not standalone AWS services here

- **AWS CDK** is the infrastructure-as-code toolkit used to define resources in TypeScript; it synthesizes CloudFormation templates.
- **GitHub Actions** runs the CI/CD workflows outside AWS. It builds/tests images and uses OIDC to request temporary AWS credentials.
- **OIDC** is the federation protocol; the AWS-side trust is configured through IAM and credentials are issued by STS.
- **Next.js and NestJS** are application frameworks running in ECS containers, not AWS services.

## Not currently part of the deployed path

- **Amazon Route 53 and AWS Certificate Manager (ACM):** the CDK supports optional custom DNS/certificate settings, but current access uses the CloudFront-generated hostname and the ALB origin is HTTP. No custom Route 53 record or ALB ACM certificate is required for that generated-hostname setup.
- **Lambda, API Gateway, NAT Gateway, WAF, SNS, and a media-processing worker:** not part of the current request path/configuration. SQS is provisioned, but a worker is still needed before queued processing happens.
- **A connection to the legacy PHP database:** none. The new RDS instance is standalone. The BFF may call the legacy PHP API for legacy capabilities, but that is an HTTP integration, not shared database access.

## Practical interpretation

For normal user requests, the main path is **CloudFront → ALB → ECS/Fargate**. The BFF then uses **RDS** for metadata and **S3** for file bytes; **SQS/DLQ** are for future or asynchronous processing. **IAM/Secrets Manager/VPC/CloudWatch** provide access control, secret delivery, isolation, and observability. **ECR + GitHub Actions + OIDC/STS + CloudFormation/CDK** form the build-and-deploy path.

This inventory reflects infrastructure definitions, not a live account audit. Use the AWS console/CLI to confirm which resources are currently deployed, running, or paused before making operational or cost decisions.

## Related guides

- [AWS development and BFF deployment guide](aws-development-deployment-guide.md)
- [Next.js on ECS guide](aws-nextjs-ecs-development-guide.md)
- [SIT cost guide](SIT-cost.md)
- [RDS record access guide](aws-rds-record-access-guide.md)

## AWS documentation

- [CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
- [ECS with Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [RDS Multi-AZ](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html)
- [ECS networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking-outbound.html)
- [GitHub OIDC with AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

