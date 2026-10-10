# AWS social import configuration

This guide configures Pinterest, Instagram, and Facebook imports for the AWS-hosted BFF. Provider secrets stay in AWS Secrets Manager and never enter Git, the frontend, the Docker image, or GitHub Actions.

## What the deployment creates

The BFF CDK stack creates one JSON secret and exposes its ARN as the CloudFormation output `SocialImportSecretArn`. ECS injects individual JSON properties into the BFF container.

The expected JSON fields are:

```json
{
  "signingSecret": "keep-the-generated-value",
  "pinterestClientId": "",
  "pinterestClientSecret": "",
  "pinterestRedirectUri": "",
  "instagramClientId": "",
  "instagramClientSecret": "",
  "instagramRedirectUri": "",
  "facebookClientId": "",
  "facebookClientSecret": "",
  "facebookRedirectUri": ""
}
```

`signingSecret` signs short-lived OAuth state and import tickets. Preserve it when updating provider values.

## 1. Deploy once to create the secret

Run the `Deploy BFF Development` GitHub workflow from `codex/media-platform-aws`. After it succeeds, obtain the secret ARN:

```bash
aws cloudformation describe-stacks \
  --stack-name YslBffDevStack \
  --query "Stacks[0].Outputs[?OutputKey=='SocialImportSecretArn'].OutputValue" \
  --output text \
  --region ap-southeast-1
```

## 2. Read and safely edit the current value

Create a temporary local file with restricted permissions:

```bash
umask 077
aws secretsmanager get-secret-value \
  --secret-id '<SOCIAL_IMPORT_SECRET_ARN>' \
  --query SecretString \
  --output text \
  --region ap-southeast-1 > /tmp/ysl-social-import-secret.json
```

Edit `/tmp/ysl-social-import-secret.json`, populate the provider values, and keep the existing `signingSecret` unchanged.

Update Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id '<SOCIAL_IMPORT_SECRET_ARN>' \
  --secret-string file:///tmp/ysl-social-import-secret.json \
  --region ap-southeast-1
```

Delete the temporary secret file after the update:

```bash
rm /tmp/ysl-social-import-secret.json
```

Do not paste client secrets directly into a shell command because they can remain in shell history.

## 3. Register provider callback URLs

The callback paths are:

```text
<BFF_ORIGIN>/api/v1/social-imports/pinterest/callback
<BFF_ORIGIN>/api/v1/social-imports/instagram/callback
<BFF_ORIGIN>/api/v1/social-imports/facebook/callback
```

For the current ALB, replace `<BFF_ORIGIN>` with the full ALB origin. The value registered in the provider console and the value stored in Secrets Manager must match character-for-character.

Important: Meta normally requires HTTPS for non-localhost OAuth callbacks. The current HTTP ALB can deploy and serve the BFF, but Facebook and Instagram manual OAuth testing may remain blocked until ACM, DNS, and the HTTPS listener are configured. Do not weaken the callback or state checks to work around this requirement.

## 4. Restart ECS after changing the secret

ECS reads secrets when a task starts. Force a new deployment after updating Secrets Manager:

```bash
aws ecs update-service \
  --cluster ysl-bff-dev-cluster \
  --service ysl-bff-dev \
  --force-new-deployment \
  --region ap-southeast-1
```

Wait until stable:

```bash
aws ecs wait services-stable \
  --cluster ysl-bff-dev-cluster \
  --services ysl-bff-dev \
  --region ap-southeast-1
```

## 5. How the secure flow works

1. The authenticated frontend asks the BFF for a provider authorization URL.
2. The BFF includes a signed, user-bound, ten-minute OAuth state.
3. The provider redirects to the public BFF callback.
4. The BFF verifies state before exchanging the authorization code.
5. The popup receives provider media plus signed, thirty-minute import tickets; it never receives the provider access token.
6. The Photos page sends a selected ticket to the authenticated media-library import endpoint.
7. The BFF verifies that the ticket belongs to the current user, downloads the image server-to-server, stores it in private S3, records it in PostgreSQL, and queues derivative processing.

Existing story/contact picker callers remain on the legacy import path until their complete PHP attachment workflows are migrated. The Photos page uses the new standalone media API.

## 6. Troubleshooting

- `501 not configured`: one or more required provider fields are blank, or the ECS task was not restarted after the secret update.
- Popup closes without data: callback state failed, the provider rejected the code, or `APP_ORIGIN` does not exactly match the frontend origin.
- Meta rejects redirect URI: configure ACM/DNS/HTTPS and register the HTTPS callback.
- Import authorization expired: reconnect the provider; OAuth state and import tickets are deliberately short-lived.
- SQS processing retries: inspect the main queue, DLQ, and `/ysl/bff/dev` CloudWatch log group.

