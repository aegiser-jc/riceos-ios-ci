#!/bin/bash
# Boot the simulator, install RiceOS, record the screen while the UI test drives the deletion path.
# Needs: SIM_UDID, APP_PATH, REC_PIN (masked), REC_PHONES. Writes out/raw.mp4, out/marks.txt, out/ui.log (ui.log is NOT uploaded).
set -uo pipefail
OUT="$GITHUB_WORKSPACE/out"; mkdir -p "$OUT"; rm -f /tmp/rec-marks.txt
xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
xcrun simctl bootstatus "$SIM_UDID" -b
xcrun simctl status_bar "$SIM_UDID" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
xcrun simctl install "$SIM_UDID" "$APP_PATH"
xcrun simctl privacy "$SIM_UDID" grant location com.donaus.riceos || true
xcrun simctl location "$SIM_UDID" set 16.8211,100.2659 || true
xcrun simctl ui "$SIM_UDID" appearance light || true
sleep 8
xcrun simctl io "$SIM_UDID" recordVideo --codec h264 --force "$OUT/raw.mp4" 2>"$OUT/rec.log" &
RP=$!
for i in $(seq 1 150); do grep -q "Recording started" "$OUT/rec.log" 2>/dev/null && break; sleep 0.1; done
python3 -c 'import time;print("REC_START", "%.3f" % time.time())' > "$OUT/marks.txt"
cat "$OUT/rec.log"
cd "$GITHUB_WORKSPACE/rec"
TEST_RUNNER_REC_PIN="$REC_PIN" TEST_RUNNER_REC_PHONES="$REC_PHONES" TEST_RUNNER_REC_MARKS_FILE=/tmp/rec-marks.txt \
  xcodebuild test-without-building -project RecUI.xcodeproj -scheme RecUITests -destination "id=$SIM_UDID" -derivedDataPath "$GITHUB_WORKSPACE/rec-dd" >"$OUT/ui.log" 2>&1
RC=$?
sleep 1
kill -INT "$RP"; wait "$RP"
{ grep -aoE '(REC_MARK [a-z_0-9]+ [0-9.]+|TRY_PHONE [0-9]+|TAKEN_PHONE [0-9]+|USED_PHONE [0-9]+|DELETED_OK)' "$OUT/ui.log" || cat /tmp/rec-marks.txt 2>/dev/null; } | grep -av "$REC_PIN" >> "$OUT/marks.txt"
echo "--- marks"; cat "$OUT/marks.txt"
echo "--- ui log (filtered)"; grep -aE 'DIAG|REC_MARK|PHONE|DELETED_OK|Test Case|error:|failed|passed|\*\* TEST' "$OUT/ui.log" | grep -av "$REC_PIN" | cut -c1-400 | tail -80
if grep -aq '^DIAG missing\|^DIAG register failed\|^DIAG plot step\|^DIAG no element' "$OUT/ui.log"; then echo "--- tree dump (masked)"; awk '/^DIAG (missing|register failed|plot step|no element|date field)/{f=1} f' "$OUT/ui.log" | grep -av "$REC_PIN" | head -250; fi
ls -la "$OUT"
exit $RC
