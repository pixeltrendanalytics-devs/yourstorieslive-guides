# ACM and HTTPS for the development BFF

## What ACM does

AWS Certificate Manager (ACM) issues and renews the public TLS certificate used
by the Application Load Balancer (ALB). TLS ends at the ALB; the ALB then
forwards the request to the healthy NestJS ECS task.

```text
Browser -- HTTPS :443 --> ALB -- HTTP inside VPC --> ECS / NestJS
                            |
                            +-- ACM certificate
```

The generated `*.elb.amazonaws.com` hostname is suitable for HTTP testing, but
it cannot be the name on our ACM certificate. AWS documents that an HTTPS
request to the default ALB hostname cannot use a public certificate for the
AWS-owned `*.amazonaws.com` domain. We therefore need a hostname we control,
for example `bff-dev.yourstories.live`.

## What the repository already supports

The frontend now uses CloudFront's default `*.cloudfront.net` hostname for
viewer HTTPS, which does not require an ACM certificate or DNS. The certificate
described below is for the BFF ALB hostname, not the CloudFront distribution.
If a custom frontend domain is added later, its public ACM certificate must be
requested in `us-east-1` and attached to CloudFront; the BFF's ALB certificate
continues to live in `ap-southeast-1`.

`infra/bff-dev-stack.ts` already supports both stages:

- Without `BFF_CERTIFICATE_ARN`: public HTTP listener on port 80 and the ALB
  hostname is emitted as `BffUrl`.
- With `BFF_CERTIFICATE_ARN`: HTTPS listener on port 443, the recommended ALB
  TLS policy, and an HTTP-to-HTTPS redirect.
- With both hosted-zone variables: CDK also creates the Route 53 DNS record for
  `BFF_DOMAIN_NAME`.

The deployment workflow reads these GitHub **environment variables**:

| Variable | Example | Purpose |
| --- | --- | --- |
| `BFF_CERTIFICATE_ARN` | `arn:aws:acm:ap-southeast-1:...:certificate/...` | Certificate attached to ALB port 443 |
| `BFF_DOMAIN_NAME` | `bff-dev.yourstories.live` | Public hostname clients use |
| `BFF_HOSTED_ZONE_ID` | Route 53 zone ID | Lets CDK create the alias record |
| `BFF_HOSTED_ZONE_NAME` | `yourstories.live` | Identifies the Route 53 public zone |

`BFF_HOSTED_ZONE_ID` and `BFF_HOSTED_ZONE_NAME` must be supplied together. If
DNS is hosted outside Route 53, leave both empty and create the BFF DNS record
manually at that provider.

## One-time setup

1. In AWS Certificate Manager, switch to `ap-southeast-1`. The certificate
   attached to this regional ALB must exist in the ALB's region.
2. Request a **public certificate** for `bff-dev.yourstories.live`.
3. Choose DNS validation.
4. Add the ACM-provided validation CNAME to the public DNS zone. Keep this
   CNAME after issuance because ACM uses it for managed renewal.
5. Wait for ACM status `Issued`.
6. Add the four GitHub environment variables listed above to the repository's
   `development` environment.
7. Run `Deploy Development BFF`. CDK will update the listener and DNS record;
   it will not rebuild RDS or S3 merely because HTTPS was enabled.
8. Change the frontend environment to:

   ```text
   NEXT_PUBLIC_BFF_API_URL=https://bff-dev.yourstories.live
   ```

9. Verify:

   ```bash
   curl --fail https://bff-dev.yourstories.live/api/health
   curl --head http://bff-dev.yourstories.live/api/health
   ```

   The first request should return a healthy response. The HTTP request should
   redirect to HTTPS.

## If DNS is not in Route 53

Request and validate the certificate exactly as above, then:

1. Set `BFF_CERTIFICATE_ARN` and `BFF_DOMAIN_NAME`.
2. Leave the two hosted-zone variables empty.
3. Deploy the stack.
4. At the external DNS provider, point `bff-dev.yourstories.live` to the
   `LoadBalancerDnsName` stack output using the record type the provider
   supports (normally CNAME for a subdomain).

Do not delete the ACM validation CNAME after creating the application CNAME.
They have different purposes.

## Troubleshooting

- `Pending validation`: check the validation CNAME in public DNS, including
  whether the provider automatically appended the zone name.
- Certificate is absent in the ALB selector: confirm the console is set to
  `ap-southeast-1` and the certificate status is `Issued`.
- Browser name mismatch: the URL hostname must be present in the certificate's
  subject/SAN list. Do not test TLS through the raw ALB hostname.
- Frontend mixed-content error: the frontend is HTTPS but
  `NEXT_PUBLIC_BFF_API_URL` still starts with `http://`.
- CORS error after HTTPS works: add the exact frontend origin to
  `CORS_ALLOWED_ORIGINS`; CORS and TLS are separate controls.

## AWS references

- [ACM DNS validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html)
- [Certificates for an Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html)
- [Create an ALB HTTPS listener](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html)
- [ALB certificate-name troubleshooting](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html)

