serve:
	node server.js

check:
	npx tsc --watch

build:
	node build-client.js
watch:
	node build-client.js watch

test:
	npm test

.PHONY: test
