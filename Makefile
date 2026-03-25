# =============================================================================
# Makefile — Vantage Portal MSSP Platform
#
# Convenience targets for Docker Compose operations.
# Run `make help` for available commands.
# =============================================================================

COMPOSE        := docker compose
COMPOSE_FILE   := docker-compose.yml
COMPOSE_PROD   := $(COMPOSE_FILE) -f docker-compose.prod.yml
WEB_SERVICE    := web

.PHONY: help up down restart logs build shell \
        db-reset db-shell nats-shell \
        prod-up prod-down prod-build \
        clean prune

# ---------------------------------------------------------------------------
# Default target
# ---------------------------------------------------------------------------
help:
	@echo ""
	@echo "Vantage Portal — Docker targets"
	@echo "================================"
	@echo ""
	@echo "  Development:"
	@echo "    make up          Start all services in background"
	@echo "    make down        Stop and remove containers (keep volumes)"
	@echo "    make restart     Restart all services"
	@echo "    make logs        Stream web service logs (Ctrl-C to exit)"
	@echo "    make build       Rebuild all images (no cache)"
	@echo "    make shell       Open sh shell in web container"
	@echo ""
	@echo "  Database:"
	@echo "    make db-reset    Re-run all Supabase migrations in web container"
	@echo "    make db-shell    Open psql shell in postgres container"
	@echo ""
	@echo "  NATS:"
	@echo "    make nats-shell  Open sh shell in nats container"
	@echo ""
	@echo "  Production:"
	@echo "    make prod-up     Start production stack (compose + prod overrides)"
	@echo "    make prod-down   Stop production stack"
	@echo "    make prod-build  Build production images"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean       Stop containers and remove volumes"
	@echo "    make prune       Remove unused Docker images and build cache"
	@echo ""

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------
up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

restart:
	$(COMPOSE) -f $(COMPOSE_FILE) restart

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f $(WEB_SERVICE)

build:
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache

shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec $(WEB_SERVICE) sh

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
db-reset:
	$(COMPOSE) -f $(COMPOSE_FILE) exec $(WEB_SERVICE) pnpm supabase db reset

db-shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec postgres psql -U postgres -d postgres

# ---------------------------------------------------------------------------
# NATS
# ---------------------------------------------------------------------------
nats-shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec nats sh

# ---------------------------------------------------------------------------
# Production
# ---------------------------------------------------------------------------
prod-up:
	$(COMPOSE) -f $(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE) -f $(COMPOSE_PROD) down

prod-build:
	$(COMPOSE) -f $(COMPOSE_PROD) build --no-cache

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
clean:
	$(COMPOSE) -f $(COMPOSE_FILE) down -v

prune:
	docker image prune -f
	docker builder prune -f
