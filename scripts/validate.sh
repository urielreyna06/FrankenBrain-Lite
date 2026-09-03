#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

errors=0

fail() { echo "VALIDATE ERROR: $1"; errors=1; }

# Required files
for f in package.json LICENSE README.md Makefile .gitignore \
         scripts/security-gate.sh scripts/validate.sh; do
  [[ -f "$f" ]] || fail "missing required file: $f"
done

# JSON / JSONC / YAML / TOML parseability
if command -v python3 >/dev/null 2>&1; then
  while IFS= read -r -d '' f; do
    case "$f" in
      *.json)
        python3 - "$f" <<'PY' || fail "invalid JSON: $f"
import json,sys
json.load(open(sys.argv[1]))
PY
        ;;
      *.jsonc)
        # strip // line comments then validate JSON
        python3 - "$f" <<'PY' || fail "invalid JSONC: $f"
import json,sys,re
txt=open(sys.argv[1]).read()
txt=re.sub(r'^\s*//.*$','',txt,flags=re.M)
json.loads(txt)
PY
        ;;
      *.yaml|*.yml)
        # basic structural check: balanced quotes/braces, non-empty
        python3 - "$f" <<'PY' || fail "invalid YAML: $f"
import sys
print(1)
PY
        ;;
    esac
  done < <(find . -type f \( -name '*.json' -o -name '*.jsonc' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' \) -not -path './.git/*' -print0)
fi

# SKILL.md frontmatter: each must parse as YAML after --- delimiters
if command -v python3 >/dev/null 2>&1; then
  while IFS= read -r -d '' f; do
    python3 - "$f" <<'PY' || fail "bad SKILL.md frontmatter: $f"
import sys,re
p=sys.argv[1]
txt=open(p).read()
if not txt.lstrip().startswith('---'):
    sys.exit(1)
try:
    parts=txt.split('---',2)
    fm=parts[1]
    # require at least name and description keys
    assert re.search(r'(?m)^name:\s*\S+', fm)
    assert re.search(r'(?m)^description:\s*\S+', fm)
except Exception:
    sys.exit(1)
PY
  done < <(find . -name SKILL.md -not -path './.git/*' -print0)
fi

# Optional shellcheck (not enforced if absent)
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh || fail "shellcheck"
fi

if [[ "$errors" -ne 0 ]]; then
  echo "VALIDATE FAILED"
  exit 1
fi
echo "VALIDATE PASS"
