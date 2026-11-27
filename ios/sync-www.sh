#!/bin/sh
# Copy ../app into www/ (same exclusions as android/BUILD.md)
set -e
cd "$(dirname "$0")"
rm -rf www && mkdir www
rsync -a --exclude tests --exclude handoff.md --exclude handoff-W4.md --exclude README.md --exclude capacitor.config.json ../app/ www/
# iOS only: game layers below the status bar (contentInset never). Fails the build if the hook is missing.
cp ios-web/game-ios.css www/game/css/game-ios.css
perl -0pi -e 's#</head>#<link rel="stylesheet" href="css/game-ios.css"></head>#' www/game/index.html
grep -q 'css/game-ios.css' www/game/index.html
