rm -rf dist
mkdir dist

echo "Building bundle..."
# creates public/js/bundle.js
make build

echo "Building docs..."
# creates docs
npx typedoc src/*.ts
echo $?

echo "Copying..."
cp -rv \
  public/index.html \
  public/js \
  public/assets \
  public/style.css \
  docs/
  dist
