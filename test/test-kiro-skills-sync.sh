#!/usr/bin/env bash
# test/test-kiro-skills-sync.sh
# Kiro consume skills SOLO desde .kiro/skills/ (doc oficial: no descubre skills
# desde un path arbitrario; #[[file:]] solo inyecta texto, no registra una skill).
# Por eso .kiro/skills/ es una copia versionada que DEBE mantenerse en sincronia
# con skills/. Este test impide que vuelva a derivar (deriva real 2026-09-24..10-01).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
fail() { echo "KIRO SKILLS SYNC TEST ERROR: $1" >&2; exit 1; }

[[ -d .kiro/skills ]] || fail "missing .kiro/skills directory"
[[ -d skills ]] || fail "missing skills directory"

# 1) Skills retiradas en todo el ecosistema no deben vivir en .kiro/skills tampoco.
#    (misma lista que test-skill-neutrality.sh para skills/.)
for retired in brainstorming writing-plans test-driven-development \
               systematic-debugging verification-before-completion using-dev; do
  [[ ! -e ".kiro/skills/$retired" ]] || fail "retired skill present in Kiro mirror: $retired"
done

# 2) Toda skill del espejo (dir con SKILL.md) debe existir en skills/ y ser
#    identica arbol-a-arbol. Sin esto, el espejo deriva en silencio.
missing=""
drifted=""
for dir in .kiro/skills/*/; do
  name="$(basename "$dir")"
  [[ -f "$dir/SKILL.md" ]] || continue           # solo paquetes-skill reales
  if [[ ! -d "skills/$name" ]]; then
    missing+=" $name"
    continue
  fi
  if ! diff -rq "skills/$name" ".kiro/skills/$name" >/dev/null 2>&1; then
    drifted+=" $name"
  fi
done
[[ -z "$missing" ]] || fail "Kiro mirror has skills absent from skills/:$missing"
[[ -z "$drifted" ]] || fail "Kiro mirror out of sync with skills/ (run sync):$drifted"

echo "KIRO SKILLS SYNC TEST PASS"
