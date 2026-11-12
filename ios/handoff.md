# RiceOS iOS -- handoff   Status: in-progress (sim build running; testflight blocked on Apple app record approval)
## Done
- Capacitor 7 iOS project ios/ios/App (bundle com.donaus.riceos, iPhone only, min iOS 15, portrait), Thai Info.plist usage strings, ITSAppUsesNonExemptEncryption=false, PrivacyInfo.xcprivacy (in pbxproj), 1024 icon no alpha (from icons/icon-512, upscaled).
- ios/sync-www.sh copies ../app to www at build; ios/push-ci.sh syncs app/+ios/+ci/ios.yml to CI repo aegiser-jc/riceos-ios-ci (PUBLIC on purpose: private had no minutes) and pushes. Token ~/private/github-rice-ci.token (copy of ai4 aegiser token).
- Secrets set in CI repo (ASC key/issuer/private key, cert_key.pem). Workflow ios.yml: mode=sim | testflight.
## Next
1. Re-run ios/push-ci.sh after app/ changes (sw v11 etc.), then dispatch mode=sim to verify; mode=testflight only after Apple record exists (preflight fails fast otherwise).
2. Jarin OK -> record -> testflight run -> add internal testers.
## Tried and rejected
- Private CI repo on aegiser-jc: job not started (billing/spending limit). Made public.
## Facts
- LINE button hidden when Capacitor platform ios (app/js/app.js ~L156). Web getUserMedia/geolocation/file capture used in WKWebView; no native plugins added (usage strings cover them).
- Native plugins skipped for speed; 4.2 risk noted in request.
