watch:
	`npm bin`/webpack --watch

test:
	./node_modules/.bin/mocha --ignore-leaks --reporter list

.PHONY: test
