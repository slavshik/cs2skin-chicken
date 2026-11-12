# Build entry point for the game. `make` lists the targets.

NPX := npx --no-install

.DEFAULT_GOAL := help
.PHONY: help install dev build check typecheck boundaries format format-check assets tokens serve clean distclean

help: ## List targets
	@awk 'BEGIN { FS = ":.*## " } /^[a-z][a-z-]*:.*## / { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: node_modules ## Install dependencies

dev: | node_modules ## Dev server
	$(NPX) vite

build: typecheck | node_modules ## Typecheck, then build into dist/
	$(NPX) vite build

check: typecheck boundaries format-check ## Typecheck, check the game/UI split and formatting

typecheck: | node_modules ## Typecheck without emitting
	$(NPX) tsc --noEmit

boundaries: ## Fail if src/ui and the Pixi game import each other (scripts/boundaries.ts)
	node scripts/boundaries.ts

format: | node_modules ## Format every file with Prettier
	$(NPX) prettier --write .

format-check: | node_modules ## Fail if any file is unformatted
	$(NPX) prettier --check .

assets: ## Build src/assets/assets.json's atlases, images, sound sprite from raw_assets/
	python3 scripts/assets.py

tokens: | node_modules ## Generate src/app/ui/tokens.ts and design/tokens.css from design/tokens.json
	node scripts/tokens.ts
	$(NPX) prettier --log-level warn --write src/app/ui/tokens.ts design/tokens.css

serve: | node_modules ## Serve dist/ to open the build on a device
	$(NPX) vite preview --outDir dist

clean: ## Remove build output
	rm -rf dist

distclean: clean ## Remove build output and dependencies
	rm -rf node_modules

node_modules: package-lock.json
	npm install
	@touch node_modules
