serve:
	node server.js

check:
	npx tsc --watch

build:
	node build-client.mjs

watch:
	node build-client.mjs watch

.PHONY: test
test:
	npm test


.PHONY: docs
docs:
	npm run docs

# deploy to github pages
deploy:
	git push origin "main:deploy"

count:
	ag -g 'tsx?$$' --ignore='tests' --ignore='level-data.ts' | xargs wc -l
