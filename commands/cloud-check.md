---
description: Diagnóstico de conectividad con AWS y GCP — identidad, proyecto, y CLI saludables
agent: build
---

# Cloud Check

Verifica que los CLIs de nube funcionan y pueden autenticarse. Carga la skill `cloud-cli-operations`.

## AWS
1. `aws --version` — ¿binario presente?
2. `aws configure list` — ¿qué perfiles/región hay configurados? (NO imprimas credenciales)
3. `aws sts get-caller-identity --output json` — si hay credenciales, muestra Account/Arn. Si falla con `NoCredentials`/`ExpiredToken`, avisa qué falta y cómo arreglarlo.

## GCP
1. `gcloud --version | head -1` — ¿binario presente?
2. `gcloud auth list` — ¿hay cuentas autenticadas?
3. `gcloud config list` — proyecto activo (¿está seteado o vacío?)
4. Si hay cuenta autenticada: `gcloud projects list --format="table(projectId,name)"` para confirmar acceso real.

## Reporte final
Resume por proveedor: binario OK / credenciales OK / cuenta conectada (y a qué cuenta/proyecto) / qué paso de auth falta. Si falta auth, da el comando exacto (`aws configure`, `aws configure sso`, `gcloud auth login`) sin pedir credenciales.
