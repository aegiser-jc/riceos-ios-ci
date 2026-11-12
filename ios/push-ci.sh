#!/bin/sh
# Sync app/ + ios/ + workflow into the CI repo clone and push. Usage: ios/push-ci.sh [commit message]
# Needs GH_TOKEN_FILE (default ~/private/github-rice-ci.token) and CI repo in $CI_REPO (default aegiser-jc/riceos-ios-ci).
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; W="$R/ios/.ci-work"; REPO="${CI_REPO:-aegiser-jc/riceos-ios-ci}"
T="$(cat "${GH_TOKEN_FILE:-$HOME/private/github-rice-ci.token}")"
[ -d "$W/.git" ] || git clone -q "https://x-access-token:$T@github.com/$REPO.git" "$W"
git -C "$W" remote set-url origin "https://x-access-token:$T@github.com/$REPO.git"
git -C "$W" pull -q --rebase 2>/dev/null || true
rsync -a --delete --exclude tests --exclude node_modules --exclude .ci-work --exclude Pods "$R/app/" "$W/app/"
rsync -a --delete --exclude node_modules --exclude .ci-work --exclude Pods --exclude www "$R/ios/" "$W/ios/"
mkdir -p "$W/.github/workflows" && cp "$R/ios/ci/ios.yml" "$W/.github/workflows/ios.yml"
cd "$W" && git add -A && { git diff --cached --quiet || git -c user.name=riceos-ci -c user.email=ci@donaus.com commit -qm "${1:-sync}"; } && git push -q origin HEAD:main && git rev-parse --short=12 HEAD
