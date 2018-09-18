watch:
	`npm bin`/webpack --watch

test:
	./node_modules/.bin/mocha --reporter list

.PHONY: test
