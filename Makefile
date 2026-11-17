.PHONY: install backend frontend test typecheck build admin

install:
	npm install

# Dev on the host: `make backend` and `make frontend` in two terminals
# (http://localhost:5173, API on :3014). Or Docker: see docker-compose.override.example.yml.
backend:
	npm run dev -w backend

frontend:
	npm run dev -w frontend

test:
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

# make admin NAME=estv
admin:
	npm run create-admin -w backend -- $(NAME)
