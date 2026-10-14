.PHONY: validate security test health help check install update uninstall verify-install

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
	node test/test-frontmatter.mjs
	node test/test-reconcile.mjs
	node test/test-agents.mjs
	node test/test-instincts.mjs
	node test/test-bootstrap.mjs
	bash test/test-skill-neutrality.sh
	bash test/test-kiro-skills-sync.sh
	bash test/test-observer-backend.sh
	node test/test-install.mjs
	node --test test/lite-health.test.mjs

health:
	node scripts/lite-health.mjs

check: security validate test

install:
	node scripts/fbl-install.mjs install --harness $(or $(HARNESS),all)

update:
	node scripts/fbl-install.mjs update --harness $(or $(HARNESS),all)

uninstall:
	node scripts/fbl-install.mjs uninstall --harness $(or $(HARNESS),all)

verify-install:
	node scripts/fbl-install.mjs verify --harness $(or $(HARNESS),all)
