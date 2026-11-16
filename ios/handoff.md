# RiceOS iOS -- handoff   Status: done for upload -- build 5 (v1.0) processingState VALID in TestFlight (13 Nov 2026); NOT submitted, no testers added
## Done
- Capacitor 7 iOS project ios/ios/App (bundle com.donaus.riceos, iPhone only, min iOS 15, portrait), Thai Info.plist usage strings, ITSAppUsesNonExemptEncryption=false, PrivacyInfo.xcprivacy (in pbxproj), 1024 icon no alpha (from icons/icon-512, upscaled).
- ios/sync-www.sh copies ../app to www at build; ios/push-ci.sh syncs app/+ios/+ci/ios.yml to CI repo aegiser-jc/riceos-ios-ci (PUBLIC on purpose: private had no minutes) and pushes. Token ~/private/github-rice-ci.token (copy of ai4 aegiser token).
- Secrets set in CI repo (ASC key/issuer/private key, cert_key.pem). Workflow ios.yml: mode=sim | testflight.
## Next
0. Build 5 VALID (ASC app 6834153807). Adding internal testers = Apple account change -> needs Jarin's OK. Review submission not done.
1. Re-run ios/push-ci.sh after app/ changes (sw v11 etc.), then dispatch mode=sim to verify; mode=testflight only after Apple record exists (preflight fails fast otherwise).
2. Jarin OK -> record -> testflight run -> add internal testers.
## Tried and rejected
- testflight run 1 (43325435995): build-ipa failed, --project and --workspace together -> workspace only. Run 2 (43325755915): altool 409 'built with iOS 18.5 SDK, need iOS 26' -> runner macos-26 + xcode-select newest Xcode_26*. Run 3 (43326215782) success.
- gh CLI not installed; use ios/ghapi.sh (curl, token from file) to dispatch/inspect runs.
- Private CI repo on aegiser-jc: job not started (billing/spending limit). Made public.
## Facts
- LINE button hidden when Capacitor platform ios (app/js/app.js ~L156). Web getUserMedia/geolocation/file capture used in WKWebView; no native plugins added (usage strings cover them).
- Native plugins skipped for speed; 4.2 risk noted in request.

## Internal TestFlight (2026-11-12, authorized by Jarin)
- ASC users: jarin.chiangboon@gmail.com (ACCOUNT_HOLDER, ADMIN), aegiser@hotmail.com (DEVELOPER). jarin@donaus.com / admin@donaus.com NOT ASC users.
- Group 'RiceOS Internal' (internal) id 1fd61d5e-6698-4375-b184-8f89e67e330b; build 5 (ddef103e-e983-4c48-b8a7-2903057d7bb0) attached.
- Tester added: jarin.chiangboon@gmail.com (state INVITED). aegiser@hotmail.com refused: 409 STATE_ERROR "Tester(s) cannot be assigned" (not retried).
- Nothing else changed; no review submission.

## Update 12 Nov (vc3 fixes)
- push-ci sha 183768d24ce0 (CI repo); testflight run 43331550157 = success (should be build 6). Includes API base, CapacitorHttp, @capacitor/app Back handler, plots UX, no sample figures, BAAC wording. Not submitted for review.

## ASC tester + build attach (13 Nov 2026, authorized by Jarin via Assist)
- Build 7 (df23d99b-a267-4486-8482-947d1dd412a4, VALID) attached to group 1fd61d5e-6698-4375-b184-8f89e67e330b: POST relationships/builds -> 204. Verified GET group builds: build 7 + build 5 (ddef103e...) both VALID.
- Tester aegiser@hotmail.com NOT added: POST /v1/betaTesters -> 409 "Tester(s) cannot be assigned" (same as 12 Nov, so the PLA acceptance did not clear it).
- Cause (read-only check): aegiser@hotmail.com is DEVELOPER with allAppsVisible=false, and its visibleApps (6 apps: com.voyiro.*, com.aimee.mali, com.donaus.itmean) do NOT include RiceOS app 6834153807 (com.donaus.riceos). Internal testers must be able to see the app.
- Fix needed (Jarin decision, not done): in ASC Users and Access, give aegiser@hotmail.com access to RiceOS (or allAppsVisible), then re-run the tester add. Not changed by the agent, since that is an access change outside the authorized scope.
- Group now: testers = jarin.chiangboon@gmail.com (INVITED). No invites, metadata or review changes made.
