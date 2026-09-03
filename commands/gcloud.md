---
description: Operación segura de Google Cloud via gcloud ($ARGUMENTS) — explora antes, usa --format=json, nunca filtres secretos
agent: build
---

# Google Cloud Operations

Work with Google Cloud resources using the gcloud CLI for: $ARGUMENTS

1. Load the `cloud-cli-operations` skill if not already active.
2. **Detect scope first**: run `gcloud config list` to confirm the active account and project; use `--project=<id>` explicitly per command when the task implies one.
3. For read operations: `--format=json` + `jq` extraction. Keep the response concise: only the fields relevant to the request.
4. For write operations: show exactly what will change, use `--dry-run` where available, and get explicit approval before executing.
5. Never print service-account keys or `GOOGLE_APPLICATION_CREDENTIALS` contents.
6. If a command fails, interpret the error (see the skill's failure table) before retrying — do not retry blindly.

Report a short summary of what was queried/changed and the resolved account/project.
