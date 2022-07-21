serve:
	node server.js

build:
	node build-client.js

test:
	npx mocha --reporter list

.PHONY: test
