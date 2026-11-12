#!/bin/sh
# Copy ../app into www/ (same exclusions as android/BUILD.md)
set -e
cd "$(dirname "$0")"
rm -rf www && mkdir www
rsync -a --exclude tests --exclude handoff.md --exclude handoff-W4.md --exclude README.md --exclude capacitor.config.json ../app/ www/
