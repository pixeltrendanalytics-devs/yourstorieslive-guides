# Safely connect to the development PostgreSQL database

## Recommended path

The RDS instance is private. Do not make it public and do not put its password
on a developer laptop. Connect through the already-running BFF task with ECS
Exec:

```text
Developer AWS CLI
       |
       | IAM-authenticated SSM session (ECS Exec)
       v
running BFF container -- private network --> RDS PostgreSQL
```

The feature branch already enables ECS Exec, grants the task the required
`ssmmessages` permissions, and installs the PostgreSQL `psql` client in the
container. ECS Exec uses Systems Manager Session Manager; access is controlled
by IAM and can be audited through CloudTrail.

## Prerequisites on the developer machine

- AWS CLI v2
- Session Manager plugin
- AWS credentials for the development account
- IAM permission for `ecs:ExecuteCommand` plus the read calls used below
- At least one running task in service `ysl-bff-dev`

Use region `ap-southeast-1` throughout.

## Connect to the container

These commands discover names rather than hardcoding generated task/container
identifiers:

```bash
export AWS_REGION=ap-southeast-1
export YSL_CLUSTER=ysl-bff-dev-cluster
export YSL_SERVICE=ysl-bff-dev

export YSL_TASK_ARN="$(aws ecs list-tasks \
  --region "$AWS_REGION" \
  --cluster "$YSL_CLUSTER" \
  --service-name "$YSL_SERVICE" \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text)"

export YSL_CONTAINER="$(aws ecs describe-tasks \
  --region "$AWS_REGION" \
  --cluster "$YSL_CLUSTER" \
  --tasks "$YSL_TASK_ARN" \
  --query 'tasks[0].containers[0].name' \
  --output text)"

aws ecs execute-command \
  --region "$AWS_REGION" \
  --cluster "$YSL_CLUSTER" \
  --task "$YSL_TASK_ARN" \
  --container "$YSL_CONTAINER" \
  --interactive \
  --command '/bin/sh'
```

If `YSL_TASK_ARN` is `None`, start the development environment or wait for ECS
to reach a healthy desired count before retrying.

## Open PostgreSQL from inside the container

The BFF container already receives the database host, port, database name,
username, and password as runtime environment values. Do not print them.

```bash
PGPASSWORD="$MEDIA_DATABASE_PASSWORD" psql \
  "host=$MEDIA_DATABASE_HOST port=$MEDIA_DATABASE_PORT dbname=$MEDIA_DATABASE_NAME user=$MEDIA_DATABASE_USERNAME sslmode=verify-full sslrootcert=$MEDIA_DATABASE_CA_CERT_PATH"
```

The prompt should identify database `ysl_media`.

## Inspect records without changing them

Start a read-only transaction before exploring:

```sql
BEGIN READ ONLY;

\conninfo
\dt
\d+ media_library_assets

SELECT status, media_kind, count(*)
FROM media_library_assets
GROUP BY status, media_kind
ORDER BY status, media_kind;

SELECT id,
       public_id,
       owner_external_user_id,
       original_filename,
       content_type,
       byte_size,
       status,
       taken_on,
       created_at,
       updated_at
FROM media_library_assets
ORDER BY created_at DESC
LIMIT 25;

ROLLBACK;
```

Useful `psql` commands:

| Command | Meaning |
| --- | --- |
| `\dt` | List tables |
| `\d+ media_library_assets` | Show columns, indexes, and details |
| `\x on` | Expanded display for wide records |
| `\timing on` | Show query duration |
| `\q` | Exit PostgreSQL |

Every application query must remain scoped by `owner_external_user_id`. When
checking a test user, use the user ID returned by the PHP sign-in flow; do not
query or export unrelated users' records.

## View the database through the AWS console

The RDS console can show instance state, metrics, logs, connectivity, storage,
and the secret reference. It is not a general table browser for this private
PostgreSQL instance. Use ECS Exec plus `psql` for records.

Do not open port 5432 to the internet just to use a desktop database client.
If a GUI becomes necessary later, create a time-bounded, audited tunnel through
an approved SSM-managed host and remove it afterward; that extra infrastructure
is not needed for current SIT work.

## Exit and clean up

Run `\q`, then `exit`. Unset the convenience variables in the local shell:

```bash
unset YSL_TASK_ARN YSL_CONTAINER YSL_CLUSTER YSL_SERVICE AWS_REGION
```

No database password was copied locally and no inbound RDS rule was added.

## Troubleshooting

- `execute command failed`: confirm ECS Exec is enabled on the current service
  deployment, the task role has SSM message permissions, and the task is new
  enough to have been started after ECS Exec was enabled.
- `TargetNotConnectedException`: check the managed agent status and outbound
  network access to Systems Manager `ssmmessages`.
- `psql: not found`: the running task is still using an older Docker image;
  deploy the latest feature-branch image.
- database timeout: verify the RDS instance is running and the RDS security
  group permits PostgreSQL from the ECS task security group.
- authentication failure: redeploy/restart the task after a secret rotation;
  never paste the secret into a command-line argument or guide.

## AWS reference

- [Using ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
- [Troubleshooting ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec-troubleshooting.html)
- [Using TLS with RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)

