#!/bin/sh
# usage: ghapi.sh METHOD PATH [json]   (token from ~/private/github-rice-ci.token, never printed)
T="$(cat ~/private/github-rice-ci.token)"
curl -s -X "$1" -H "Authorization: Bearer $T" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/aegiser-jc/riceos-ios-ci$2" ${3:+-d "$3"}
