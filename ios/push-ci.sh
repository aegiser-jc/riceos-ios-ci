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
# ios/handoff.md stays local (personal/account data; the CI repo is public): never copied, removed from the clone if present.
rsync -a --delete --exclude node_modules --exclude .ci-work --exclude Pods --exclude www --exclude /handoff.md "$R/ios/" "$W/ios/"
rm -f "$W/ios/handoff.md"
mkdir -p "$W/.github/workflows" && cp "$R/ios/ci/ios.yml" "$W/.github/workflows/ios.yml"
cd "$W" && git add -A && { git diff --cached --quiet || GIT_AUTHOR_NAME=riceos-ci GIT_AUTHOR_EMAIL=riceos-ci@noreply.invalid GIT_COMMITTER_NAME=riceos-ci GIT_COMMITTER_EMAIL=riceos-ci@noreply.invalid git -c user.name=riceos-ci -c user.email=riceos-ci@noreply.invalid commit -qm "${1:-sync}"; } && git push -q origin HEAD:main && git rev-parse --short=12 HEAD
