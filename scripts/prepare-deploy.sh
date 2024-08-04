rm -rf dist
mkdir dist

# creates public/js/bundle.js
make build

# creates docs
npx typedoc src/*.ts

cp -rv \
  public/index.html \
  public/js \
  public/assets \
  public/style.css \
  docs/ \
  dist
