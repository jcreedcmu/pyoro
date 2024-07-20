serve:
	node server.js

check:
	npx tsc --watch

build:
	node build-client.mjs
watch:
	node build-client.mjs watch

test:
	npm test

.PHONY: test
