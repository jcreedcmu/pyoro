model-common.js:
	perl wrap.pl model-tmpl.js > model-common.js

test:
	./node_modules/.bin/mocha --ignore-leaks --reporter list

.PHONY: test
