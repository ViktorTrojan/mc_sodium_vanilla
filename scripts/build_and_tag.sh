#!/usr/bin/env bash
set -e

# Read the modpack version from VERSION file
if [[ ! -f VERSION ]]; then
  echo "VERSION file not found!"
  exit 1
fi

VERSION=$(cat VERSION | tr -d '[:space:]')
echo "Detected modpack version: $VERSION"

# List of Minecraft versions to build for
MC_VERSIONS=(
  1.14 1.14.1 1.14.2 1.14.3 1.14.4
  1.15 1.15.1 1.15.2
  1.16 1.16.1 1.16.2 1.16.3 1.16.4 1.16.5
  1.17 1.17.1
  1.18 1.18.1 1.18.2
  1.19 1.19.1 1.19.2 1.19.3 1.19.4
  1.20 1.20.1 1.20.2 1.20.3 1.20.4 1.20.5 1.20.6
  1.21 1.21.1 1.21.2 1.21.3 1.21.4 1.21.5 1.21.6 1.21.7 1.21.8 1.21.9 1.21.10
)

for MC_VERSION in "${MC_VERSIONS[@]}"; do
  TAG="${MC_VERSION}_${VERSION}"

  echo
  echo "=== Building for Minecraft $MC_VERSION (tag: $TAG) ==="

  # Skip if tag already exists
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "⚠️ Tag $TAG already exists. Skipping..."
    continue
  fi

  export MC_VERSION

  # Run the build
  cd modpack_creator
  bun run dev_full
  cd ..

  # Commit and tag
  git add .
  git commit -m "Build for Minecraft $MC_VERSION (version $VERSION)" || echo "No changes to commit for $MC_VERSION"
  git tag -a "$TAG" -m "Release for Minecraft $MC_VERSION (version $VERSION)"
  git push origin HEAD
  git push origin "$TAG"

  echo "✅ Finished $MC_VERSION -> Tag: $TAG"
done

echo
echo "🎉 All builds complete!"