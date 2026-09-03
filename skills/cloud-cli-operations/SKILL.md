---
name: cloud-cli-operations
description: Safe, efficient usage of the AWS CLI and Google Cloud CLI (gcloud) for read-only exploration, resource management, and automation. Use whenever a task involves AWS or GCP resources, provisioning, debugging cloud failures, or writing automation scripts against these clouds. Complements superpowers' systematic-debugging and verification-before-completion by enforcing provider-safe command patterns, credential hygiene, and jq/yq output normalization.
metadata:
  version: 1.0.0
  origin: local-integration
  requires:
    - aws
    - gcloud
    - jq
    - yq
---

# Cloud CLI Operations (AWS + GCP)

Workflows for operating AWS and Google Cloud from the CLI without surprises.
The agents for these clouds live in `~/.config/opencode/agent/`; this skill is
the *method* (safe patterns), not the provider checklist.

## 0. Rule of thumb

- **Read before write.** Explore with list/describe/get calls before changing
  anything.
- **Never mutate blind.** Every mutating command gets `--dry-run`/`--preview`
  when available, or at minimum a confirm step with exactly what will change.
- **Never log secrets.** Do not print access keys, tokens, or `JSON` that
  contains them. Use `--no-cli-pager`, environment variables, and `[REDACTED]`
  in any visible output.
- **Pin scope.** Always resolve the *active* account/region/project before
  running anything that depends on it (see Detection below).
- **Parse, don't eyeball.** Pipe output through `jq`/`yq`; never parse with
  `grep`/`sed` on cloud output (it changes between versions).

## 1. Detection

Which provider applies?

| Signal | Provider |
|--------|----------|
| env `AWS_PROFILE`, `AWS_REGION`, `aws configure list`, files `~/.aws/credentials`, repo files `*.tf` (aws) | AWS |
| env `GOOGLE_APPLICATION_CREDENTIALS`, `CLOUDSDK_CORE_PROJECT`, repo files `*.tf` (google) or `terraform.tfvars` | GCP |
| repo contains `eks`, `lambda`, `s3`, `ec2`, `iam`, `cloudfront` | AWS |
| repo contains `gke`, `pubsub`, `storage`, `functions`, `bigquery`, `cloud run` | GCP |
| both / neither | ask, or use the task description |

## 2. Auth

### AWS
- Credential chain (in order): env `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` →
  `AWS_PROFILE`/`AWS_DEFAULT_PROFILE` → `~/.aws/credentials` + `~/.aws/config`.
- Use `--profile <name>` explicitly when the task implies one.
- Verify identity before acting: `aws sts get-caller-identity --output json`.
- SSO: `aws configure sso`, then `aws sso login --profile <name>`.
- Do **not** propose writing keys into `~/.aws/credentials` unless the user
  explicitly asks; prefer env vars for the session.

### GCP
- Default chain: `GOOGLE_APPLICATION_DEFAULT_CREDENTIALS` (ADC) → gcloud auth →
  service account JSON. The CLI uses `gcloud auth application-default login`
  for ADC used by tools, and `gcloud auth login` for the CLI itself.
- Check active project/account: `gcloud config list`.
- Set project per command with `--project=<id>` rather than changing config.

## 3. Output & formatting

- Always add `--output json` (aws) / `--format=json` (gcloud) when you need to
  parse. Keep `--output table`/`--format=table` only for human summaries.
- Pipe to jq for field extraction:
  ```bash
  aws s3 ls --output json | jq -r '.[].Name'
  gcloud compute instances list --format=json | jq -r '.[].name'
  ```
- For yaml-based configs (terraform, k8s manifests): `yq`.
- AWS pager: append `--no-cli-pager` or set `AWS_PAGER=""`. Never let pagers
  block a scripted call.
- Handle truncation: aws paginates with `--max-items`/`--page-size`; for full
  dumps use `--cli-auto-prompt` alternatives or token loops. gcloud uses
  `--filter`, `--limit`, `--page-size`.

## 4. Safe mutation patterns

AWS:
- `aws <svc> create-* --generate-cli-skeleton > /tmp/x.json` → edit → `--cli-input-json file:///tmp/x.json`
- IAM/delete operations: list first, show impact, confirm with the user.
- `--dry-run` exists for EC2 API calls (`aws ec2 run-instances --dry-run`) and
  Terraform (`terraform plan`).
- Never run `aws configure set` for keys outside an explicit user request.

GCP:
- `gcloud ... --dry-run` where available (e.g. `gcloud functions deploy --dry-run`).
- `gcloud` mutating commands that need confirmation accept `--quiet` (skip
  prompts only when the user already approved).
- Deletion: list dependent resources before removing (IAM, buckets, instances
  with attached disks).

## 5. Common failure patterns

| Error | Meaning / next step |
|-------|---------------------|
| `ExpiredToken` / `SignatureDoesNotMatch` | creds stale → re-login (`aws sso login`, `gcloud auth login`) |
| `UnauthorizedOperation` / `403` | IAM/IAM-role lacks permission; check `--dry-run` output for which API |
| `AccessDenied` (S3/Storage) | bucket/object policy, not IAM → check bucket policy/ACL |
| `ResourceInUse` / `409` | existing resource blocks it; list with `--filter` |
| `ServiceUnavailable` / `429` | throttling/quota → retry with backoff, check quota limits |
| `SDKException` / credential not found | credential chain broken → run Detection/Auth checks above |

Always resolve the failing API and its permission first; do not work around
with elevated creds.

## 6. Automation & IaC

- Terraform is provider-agnostic: plan (`terraform plan`) before apply; never
  `apply -auto-approve` without an explicit user go-ahead after showing the
  plan diff.
- Scripts that call aws/gcloud must set `AWS_PAGER=""`, `CLOUDSDK_CORE_DISABLE_PROMPTS=1`
  and use explicit `--profile`/`--project`/`--region` so they run in CI the
  same as locally.

## 7. When to delegate

- Security review of infra changes → `security-reviewer` agent.
- Architecture/scale decisions → `architect` agent.
- A deep single-provider audit → delegate to the cloud agent if one exists;
  otherwise use this skill + `verification-before-completion`.
