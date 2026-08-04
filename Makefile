.PHONY: up down dev seed test e2e check

up:
	docker compose up --build -d

down:
	docker compose down

dev:
	docker compose --profile dev up --build

seed:
	docker compose run --rm api python -m app.seed

test:
	docker compose run --rm api pytest -q

check:
	./scripts/check.sh
