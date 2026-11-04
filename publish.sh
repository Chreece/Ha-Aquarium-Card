#!/usr/bin/env bash
# Push the packaged card as the first commit of the user's empty GitHub repo.
# Never force-push or replace an existing repository history.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
remote_url="${REMOTE_URL:-https://github.com/Chreece/Ha-Aquarium-Card.git}"
if [[ -d .git ]]; then
  echo "Existing .git directory found; refusing to reinitialize. Commit and push using Git normally." >&2
  exit 1
fi
if ! git config --global user.name >/dev/null || ! git config --global user.email >/dev/null; then
  echo "Configure your Git identity first (git config --global user.name / user.email)." >&2
  exit 1
fi
if git ls-remote --exit-code --heads "$remote_url" main >/dev/null 2>&1; then
  echo "Remote main already exists; refusing to overwrite or create an unrelated history." >&2
  exit 1
fi
if command -v node >/dev/null; then
  node --check dist/ha-aquarium-card.js
  if [[ -f package.json ]]; then npm test; fi
fi
git init -b main
git remote add origin "$remote_url"
git add .github .gitignore README.md LICENSE dist docs/preview.webp docs/mobile.webp \
  hacs.json package.json tests publish.sh
git commit -m "feat: photo-first multi-aquarium Lovelace card"
git push -u origin main
echo "Published to $remote_url"
