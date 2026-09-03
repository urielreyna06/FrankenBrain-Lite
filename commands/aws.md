---
description: Operación segura de AWS via AWS CLI ($ARGUMENTS) — explora antes, nunca filtres secretos, parsea con jq
agent: build
---

# AWS Operations

Work with AWS resources using the AWS CLI for: $ARGUMENTS

1. Load the `cloud-cli-operations` skill if not already active.
2. **Detect scope first** (never assume): run `aws sts get-caller-identity --output json` and confirm the account/role; resolve region from `AWS_REGION`/`AWS_DEFAULT_REGION`/`~/.aws/config` for the profile in use.
3. For read operations: `--output json` + `jq` extraction. Keep the response concise: show only the fields relevant to the request.
4. For write operations: show exactly what will change, prefer `--dry-run`/`--generate-cli-skeleton` + `--cli-input-json`, and get explicit approval before executing.
5. Append `--no-cli-pager` to all calls; never print credentials or pre-signed URLs with secrets.
6. If a command fails, interpret the error (see the skill's failure table) before retrying — do not retry blindly.

Report a short summary of what was queried/changed and the resolved account/region.
