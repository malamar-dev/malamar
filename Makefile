.PHONY: dev dev-api dev-ui install install-api install-ui lint lint-api lint-ui fix fix-api fix-ui build build-ui pack publish

# Run both `api` and `ui` in parallel
# API runs without watch to prevent job runner from restarting
dev:
	@lsof -ti:5137 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3456 | xargs kill -9 2>/dev/null || true
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

# Build for production/npm publishing
build: build-ui
	@echo "Copying UI dist to api/ui-dist..."
	rm -rf api/ui-dist
	cp -r ui/dist api/ui-dist
	@echo "Build complete!"

build-ui:
	@echo "Building UI..."
	cd ui && bun run build

# Create local npm tarball for testing
pack: build
	cd api && npm pack

# Publish to npm
publish: build
	cd api && npm publish
