e.PHONY: dev dev-api dev-ui install install-api install-ui lint lint-api lint-ui fix fix-api fix-ui

# Run both `api` and `ui` in parallel
# API runs without watch to prevent job runner from restarting
dev:
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-api & \
	$(MAKE) dev-ui & \
	wait

dev-api:
	cd api && bun run start

dev-ui:
	cd ui && bun run dev

# Install dependencies (parallel)
install:
	@$(MAKE) install-api & \
	$(MAKE) install-ui & \
	wait

install-api:
	cd api && bun install

install-ui:
	cd ui && bun install

# Run linting (parallel)
lint:
	@$(MAKE) lint-api & \
	$(MAKE) lint-ui & \
	wait

lint-api:
	cd api && bun run lint

lint-ui:
	cd ui && bun run lint

# Run lint fix
fix:
	@$(MAKE) fix-api & \
	$(MAKE) fix-ui & \
	wait

fix-api:
	cd api && bun run lint:fix

fix-ui:
	cd ui && bun run lint:fix
