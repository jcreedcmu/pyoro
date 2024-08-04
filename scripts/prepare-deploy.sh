rm -rf dist
mkdir dist

# creates public/js/bundle.js
make build

cp -rv \
  public/index.html \
  public/js \
  public/assets \
  public/style.css \
  dist
