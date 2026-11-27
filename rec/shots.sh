#!/bin/bash
# Boot the simulator, install RiceOS, let the UI test walk the main screens and save screenshots.
# Needs: SIM_UDID, APP_PATH, REC_PIN (masked), REC_PHONES. Writes out/shots/*.png|*.txt, out/marks.txt. ui.log is NOT uploaded.
set -uo pipefail
OUT="$GITHUB_WORKSPACE/out"; SH="$OUT/shots"; mkdir -p "$SH" /tmp/riceshots; rm -f /tmp/rec-marks.txt
xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
xcrun simctl bootstatus "$SIM_UDID" -b
xcrun simctl status_bar "$SIM_UDID" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
xcrun simctl install "$SIM_UDID" "$APP_PATH"
xcrun simctl privacy "$SIM_UDID" grant location com.donaus.riceos || true
xcrun simctl location "$SIM_UDID" set 16.8211,100.2659 || true
xcrun simctl ui "$SIM_UDID" appearance light || true
sleep 8
cd "$GITHUB_WORKSPACE/rec"
TEST_RUNNER_REC_PIN="$REC_PIN" TEST_RUNNER_REC_PHONES="$REC_PHONES" TEST_RUNNER_REC_MARKS_FILE=/tmp/rec-marks.txt TEST_RUNNER_SHOTS_DIR=/tmp/riceshots \
  xcodebuild test-without-building -project RecUI.xcodeproj -scheme RecUITests -only-testing:RecUITests/ShotsTests -destination "id=$SIM_UDID" \
  -derivedDataPath "$GITHUB_WORKSPACE/rec-dd" -resultBundlePath "$OUT/ui.xcresult" >"$OUT/ui.log" 2>&1
RC=$?
cp /tmp/riceshots/* "$SH/" 2>/dev/null || true
if [ -z "$(ls "$SH"/*.png 2>/dev/null)" ]; then
  echo "no host-side PNGs, exporting xcresult attachments"
  xcrun xcresulttool export attachments --path "$OUT/ui.xcresult" --output-path "$SH" || true
fi
{ grep -aoE '(SHOT [A-Za-z0-9_-]+|NOT_REACHED .*|TRY_PHONE [0-9]+|TAKEN_PHONE [0-9]+|USED_PHONE [0-9]+|DELETED_OK|SHOTS_END)' "$OUT/ui.log" || cat /tmp/rec-marks.txt 2>/dev/null; } | grep -av "$REC_PIN" > "$OUT/marks.txt"
for f in "$SH"/*.txt; do [ -f "$f" ] && grep -q "$REC_PIN" "$f" && sed -i '' "s/$REC_PIN/******/g" "$f"; done
echo "--- marks"; cat "$OUT/marks.txt"
echo "--- banned words in on-screen labels"; grep -aniE 'demo|mock|prototype|จำลอง|ทดลอง|เดโม' "$SH"/*.txt | cut -c1-300 || echo "none"
echo "--- ui log (filtered)"; grep -aE 'DIAG|SHOT|NOT_REACHED|PHONE|DELETED_OK|Test Case|error:|failed|passed|\*\* TEST' "$OUT/ui.log" | grep -av "$REC_PIN" | cut -c1-400 | tail -120
if grep -aq '^DIAG missing\|^DIAG register failed\|^DIAG plot step\|^DIAG no element' "$OUT/ui.log"; then echo "--- tree dump (masked)"; awk '/^DIAG (missing|register failed|plot step|no element|date field)/{f=1} f' "$OUT/ui.log" | grep -av "$REC_PIN" | head -250; fi
rm -rf "$OUT/ui.xcresult"
ls -la "$SH"
exit $RC
