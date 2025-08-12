#!/bin/sh
# Small janky utility for bumping package versions across the monorepo, 
# because `npm version` doesn't really work w/ pnpm

# get version from 1st argument
VERSION=$1

# error if no version
if [ -z "$VERSION" ]; then
    echo "Usage: bump.sh <version>"
    exit 1
fi

echo "Building ..."
pnpm turbo build

for d in packages/*; do
    echo "Bumping $d to version $VERSION"
    npm pkg set -w $d version=$VERSION
done

echo ""
echo "Bumping @counterscale/server subdep in packages/cli to version $VERSION"
npm pkg set -w packages/cli dependencies.@counterscale/server=$VERSION

echo "Running pnpm install to update lockfile"
pnpm install

echo ""
echo "Next steps ..."
echo ""
echo "$ git diff  # Review changes"
echo "$ git commit -am \"$VERSION\""
echo "$ git tag v$VERSION"
echo "$ pnpm publish -r"
