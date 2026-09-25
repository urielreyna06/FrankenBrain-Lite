.PHONY: validate security test harvest help check

help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | sed 's/:/  /'

security:
	bash scripts/security-gate.sh

validate:
	bash scripts/validate.sh

test:
	bash test/test-security-gate.sh
	bash test/test-workflow-integration.sh
	node test/test-opencode-plugin.mjs
	bash test/test-session-bootstrap.sh
	bash test/test-plugin-loaders.sh

harvest:
	bash scripts/harvest.sh --apply

check: security validate test
