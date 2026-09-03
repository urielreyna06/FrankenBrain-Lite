.PHONY: validate security harvest help

help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | sed 's/:/  /'

security:
	bash scripts/security-gate.sh

validate:
	bash scripts/validate.sh

harvest:
	bash scripts/harvest.sh --apply

check: security validate
