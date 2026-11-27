import XCTest

// RiceOS iOS 1.11 (16) screen check on a simulator: launch -> notice -> consent -> register (throwaway test phone,
// per-run PIN) -> plot -> voice -> home -> missions -> lessons -> wallet -> points -> game entry -> settings ->
// delete account -> register page -> login page. Saves a PNG + an accessibility-label dump per screen to SHOTS_DIR.
// Steps after registration never stop the run: a screen that cannot be reached is logged as "NOT_REACHED <name> <why>".
// Env (TEST_RUNNER_ prefix): REC_PIN (6 digits, masked in CI), REC_PHONES, SHOTS_DIR, REC_MARKS_FILE. Never prints the PIN.
final class ShotsTests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.donaus.riceos")
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
    var shotsDir = "/tmp/shots"

    func out(_ s: String) {
        FileHandle.standardOutput.write((s + "\n").data(using: .utf8)!)
        if !s.hasPrefix("DIAG"), let path = ProcessInfo.processInfo.environment["REC_MARKS_FILE"], let d = (s + "\n").data(using: .utf8) {
            if let h = FileHandle(forWritingAtPath: path) { h.seekToEndOfFile(); h.write(d); h.closeFile() }
            else { try? d.write(to: URL(fileURLWithPath: path)) }
        }
    }
    func pause(_ s: Double) { Thread.sleep(forTimeInterval: s) }

    func shot(_ name: String, _ src: XCUIApplication? = nil) {
        pause(1.2)
        let s = XCUIScreen.main.screenshot()
        let a = XCTAttachment(screenshot: s); a.name = name; a.lifetime = .keepAlways; add(a)
        try? s.pngRepresentation.write(to: URL(fileURLWithPath: shotsDir + "/" + name + ".png"))
        let who = src ?? app
        try? who.debugDescription.write(toFile: shotsDir + "/" + name + ".txt", atomically: true, encoding: .utf8)
        out("SHOT \(name)")
    }
    func notReached(_ name: String, _ why: String) {
        out("NOT_REACHED \(name) \(why)")
        let s = XCUIScreen.main.screenshot()
        try? s.pngRepresentation.write(to: URL(fileURLWithPath: shotsDir + "/x-" + name + ".png"))
    }

    // ---------- queries ----------
    func anyExact(_ label: String) -> XCUIElementQuery {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label))
    }
    func anyContains(_ label: String) -> XCUIElementQuery {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", label))
    }
    func firstHittable(_ q: XCUIElementQuery) -> XCUIElement? {
        let n = min(q.count, 12)
        for i in 0..<n { let e = q.element(boundBy: i); if e.exists && e.isHittable { return e } }
        return nil
    }
    func waitAnyText(_ labels: [String], _ timeout: Double) -> String? {
        let end = Date().addingTimeInterval(timeout)
        repeat {
            for l in labels where anyContains(l).firstMatch.exists { return l }
            pause(0.4)
        } while Date() < end
        return nil
    }
    func diag(_ why: String) { out("DIAG \(why)"); out(app.debugDescription) }
    func must(_ labels: [String], _ timeout: Double, _ why: String) -> String {
        if let l = waitAnyText(labels, timeout) { return l }
        diag("missing \(labels) at \(why)")
        XCTFail("missing \(labels) at \(why)")
        return ""
    }

    // ---------- gestures ----------
    func scrollPage(up: Bool) {   // up: finger moves up = content scrolls down
        let wv = app.webViews.firstMatch
        guard wv.exists else { return }
        let a = wv.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: up ? 0.70 : 0.30))
        let b = wv.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: up ? 0.35 : 0.65))
        a.press(forDuration: 0.05, thenDragTo: b)
        pause(0.6)
    }
    func toTop() { for _ in 0..<6 { scrollPage(up: false) } }
    func hideKeyboard() {
        if app.keyboards.count == 0 { return }
        for name in ["Done", "เสร็จสิ้น", "เสร็จ"] {
            let b = app.toolbars.buttons[name]
            if b.exists && b.isHittable { b.tap(); pause(0.6); if app.keyboards.count == 0 { return } }
        }
        for name in ["Done", "เสร็จสิ้น"] {
            let b = app.buttons[name]
            if b.exists && b.isHittable { b.tap(); pause(0.6); if app.keyboards.count == 0 { return } }
        }
        for t in ["ลงทะเบียนใช้งาน", "ยืนยันแปลง", "สร้างบัญชีและตั้งรหัส PIN", "ลบบัญชีถาวร?", "ข้อมูลบัญชี"] {
            if let e = firstHittable(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", t))) {
                e.tap(); pause(0.6); if app.keyboards.count == 0 { return }
            }
        }
    }
    func tapEl(_ e: XCUIElement, _ name: String) {
        if !e.waitForExistence(timeout: 10) { diag("no element \(name)"); XCTFail("no element \(name)"); return }
        var tries = 0
        while !e.isHittable && tries < 8 {
            hideKeyboard()
            if e.isHittable { break }
            scrollPage(up: tries < 5)
            tries += 1
        }
        if e.isHittable { e.tap() } else {
            out("DIAG coordinate tap for \(name)")
            e.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
        pause(0.5)
    }
    func byLabel(_ label: String, _ types: [XCUIElement.ElementType]) -> XCUIElement? {
        for t in types {
            let e = app.descendants(matching: t).matching(NSPredicate(format: "label == %@", label)).firstMatch
            if e.exists { return e }
        }
        return nil
    }
    func tapLabel(_ label: String, types: [XCUIElement.ElementType] = [.button, .link]) {
        if let e = byLabel(label, types) { tapEl(e, label); return }
        let e = anyExact(label).firstMatch
        if !e.waitForExistence(timeout: 10) { if let e2 = byLabel(label, types) { tapEl(e2, label); return } }
        tapEl(e, label)
    }
    // Tap, then confirm the page reacted (busy label or an expected result) within 5 s; else re-tap (up to 4).
    func tapConfirmed(_ label: String, _ until: [String], _ timeout: Double,
                      types: [XCUIElement.ElementType] = [.button, .link]) -> String? {
        let reacted = ["กำลังส่ง", "กำลังลบ", "กำลังบันทึก"] + until
        for attempt in 0..<4 {
            hideKeyboard()
            guard let b = byLabel(label, types) else {
                if let r = waitAnyText(until, 3) { return r }
                out("DIAG \(label) not found (try \(attempt + 1))"); pause(1.0); continue
            }
            tapEl(b, label)
            if let r = waitAnyText(reacted, 5) {
                if attempt > 0 { out("DIAG \(label) reacted after tap \(attempt + 1)") }
                if r.hasPrefix("กำลัง") { return waitAnyText(until, timeout) }
                return r
            }
            out("DIAG \(label) tap \(attempt + 1) not received, retry")
            pause(1.0)
        }
        return waitAnyText(until, timeout)
    }
    // Non-fatal: find a hittable link/button whose label matches the predicate, scrolling down; tap it.
    func tryTap(_ pred: NSPredicate, _ name: String, scrolls: Int = 8) -> Bool {
        for i in 0...scrolls {
            for t in [XCUIElement.ElementType.link, .button, .any] {
                if let e = firstHittable(app.descendants(matching: t).matching(pred)) { e.tap(); pause(1.0); return true }
            }
            if i < scrolls { scrollPage(up: true) }
        }
        out("DIAG tryTap \(name) not found")
        return false
    }
    func goHome() {
        for _ in 0..<4 {
            if anyContains("ตั้งค่า / ลบบัญชี").firstMatch.exists && !app.buttons["กลับ"].exists { break }
            let b = app.buttons["กลับ"]
            if b.exists && b.isHittable { b.tap(); pause(1.5) } else { break }
        }
        if !anyContains("ตั้งค่า / ลบบัญชี").firstMatch.exists {
            out("DIAG goHome fallback via app relaunch-free activate"); app.activate(); pause(2)
        }
        toTop()
    }
    func field(_ labels: [String], secure: Bool, last: Bool = false) -> XCUIElement {
        let q = secure ? app.secureTextFields : app.textFields
        for l in labels {
            let e = q.matching(NSPredicate(format: "label == %@ OR placeholderValue == %@", l, l)).firstMatch
            if e.waitForExistence(timeout: 3) { return e }
        }
        for l in labels {
            let e = q.matching(NSPredicate(format: "label CONTAINS %@", l)).firstMatch
            if e.exists { return e }
        }
        out("DIAG field fallback \(labels) count=\(q.count)")
        return last ? q.element(boundBy: max(0, q.count - 1)) : q.firstMatch
    }
    func typeInto(_ e: XCUIElement, _ text: String, _ name: String, clear: Bool = false) {
        tapEl(e, name)
        pause(0.4)
        if clear {
            let cur = (e.value as? String) ?? ""
            e.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
            pause(0.3)
            e.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: max(cur.count, 12)))
        }
        e.typeText(text)
        pause(0.3)
    }

    // ---------- date (input type=date overlays the "แตะเพื่อเลือกวันที่" box) ----------
    func pickDate() {
        let placeholder = "แตะเพื่อเลือกวันที่"
        var target: XCUIElement? = nil
        let nonText = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'วันปลูก' AND elementType != %lu AND elementType != %lu",
                                                                          XCUIElement.ElementType.staticText.rawValue, XCUIElement.ElementType.other.rawValue)).firstMatch
        if nonText.exists { target = nonText }
        if target == nil { let p = anyContains(placeholder).firstMatch; if p.exists { target = p } }
        guard let t = target else { diag("date field not found"); return }
        tapEl(t, "date")
        pause(1.5)
        let dp = app.datePickers.firstMatch
        if dp.waitForExistence(timeout: 4) {
            if dp.pickerWheels.count > 0 {
                out("DIAG date wheels=\(dp.pickerWheels.count)")
            } else {
                let btns = dp.buttons.allElementsBoundByIndex.filter { $0.exists && $0.isHittable }
                let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
                            "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัส", "วันศุกร์", "วันเสาร์", "วันอาทิตย์"]
                let dayBtns = btns.filter { b in days.contains { b.label.contains($0) } }
                out("DIAG date buttons=\(btns.count) day=\(dayBtns.count)")
                let digitBtns = btns.filter { b in b.label.range(of: "\\d", options: .regularExpression) != nil && !b.label.lowercased().contains("month") }
                if let d = dayBtns.first ?? (digitBtns.count > 2 ? digitBtns[2] : digitBtns.first) { d.tap(); pause(1.0) }
            }
        } else {
            out("DIAG no datePicker after tap")
        }
        for name in ["Done", "เสร็จสิ้น", "เสร็จ"] {
            let b = app.buttons[name]
            if b.exists && b.isHittable { b.tap(); pause(0.8); break }
        }
        if app.datePickers.firstMatch.exists {
            if let h = firstHittable(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'ยืนยันแปลง'"))) { h.tap() }
            else { app.webViews.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap() }
            pause(0.8)
        }
        out("DIAG date placeholder still shown=\(anyContains(placeholder).firstMatch.exists)")
    }

    override func setUpWithError() throws { continueAfterFailure = false }

    func testScreens() throws {
        let env = ProcessInfo.processInfo.environment
        let pin = env["REC_PIN"] ?? ""
        shotsDir = env["SHOTS_DIR"] ?? "/tmp/shots"
        try? FileManager.default.createDirectory(atPath: shotsDir, withIntermediateDirectories: true)
        XCTAssertEqual(pin.count, 6, "REC_PIN must be 6 digits")
        let phones = (env["REC_PHONES"] ?? "0899123409").split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }

        addUIInterruptionMonitor(withDescription: "system alerts") { alert in
            for b in ["Allow While Using App", "Allow Once", "Allow", "OK", "Open", "เปิด", "อนุญาตขณะใช้แอป", "อนุญาต", "ตกลง", "Not Now"] {
                if alert.buttons[b].exists { alert.buttons[b].tap(); return true }
            }
            return false
        }

        // launch
        XCUIDevice.shared.press(.home)
        pause(2.5)
        let icon = springboard.icons["RiceOS"]
        if icon.waitForExistence(timeout: 3) && icon.isHittable { shot("00-springboard-icon", springboard); icon.tap() }
        else { out("DIAG icon not on page 1, activate()"); app.activate() }
        _ = app.wait(for: .runningForeground, timeout: 20)
        pause(1.0)
        shot("01-launch")

        // notice sheet (first run only)
        if waitAnyText(["ข้อควรทราบ"], 40) != nil {
            pause(0.8); shot("02-notice")
            if let ok = byLabel("ตกลง", [.button]) { tapEl(ok, "notice ok") }
        } else { notReached("02-notice", "no notice sheet within 40 s") }

        // consent
        _ = must(["ยินยอมและเริ่มลงทะเบียน"], 30, "consent")
        pause(0.5); shot("03-consent")
        var agree = app.buttons["ยินยอมและเริ่มลงทะเบียน"]
        let ageQs: [XCUIElementQuery] = [
            app.switches.matching(NSPredicate(format: "label CONTAINS 'ฉันอายุ 20'")),
            app.checkBoxes.matching(NSPredicate(format: "label CONTAINS 'ฉันอายุ 20'")),
            app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'ฉันอายุ 20' AND elementType != %lu", XCUIElement.ElementType.other.rawValue)),
            app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'ฉันอายุ 20'"))
        ]
        for q in ageQs {
            let e = q.firstMatch
            if !e.exists { continue }
            tapEl(e, "age checkbox")
            pause(0.6)
            agree = app.buttons["ยินยอมและเริ่มลงทะเบียน"]
            if agree.exists && agree.isEnabled { break }
        }
        out("DIAG agree enabled=\(agree.exists && agree.isEnabled)")
        tapLabel("ยินยอมและเริ่มลงทะเบียน")

        // register step 1: name, phone, PIN x2
        _ = must(["สร้างบัญชีและตั้งรหัส PIN"], 20, "register")
        pause(0.5); toTop(); shot("04-register-step1")
        let nm = field(["ชื่อที่ใช้แสดง", "เช่น ลุงสมชาย"], secure: false)
        typeInto(nm, "สมพร ใจดี", "name")
        if !((nm.value as? String) ?? "").contains("สมพร") {
            out("DIAG thai name not typed, using ASCII")
            typeInto(nm, "Somchai R", "name", clear: true)
        }
        var registered = false
        for (i, ph) in phones.enumerated() {
            let pf = field(["เบอร์มือถือ (10 หลัก)", "0812345678"], secure: false)
            typeInto(pf, ph, "phone", clear: i > 0)
            if i == 0 {
                typeInto(field(["รหัส PIN 6 หลัก (ใช้เข้าแอป)", "ใส่เลข 6 หลัก"], secure: true), pin, "pin1")
                typeInto(field(["ใส่รหัส PIN อีกครั้ง"], secure: true, last: true), pin, "pin2")
            }
            hideKeyboard()
            pause(0.5)
            out("TRY_PHONE \(ph)")
            let r = tapConfirmed("ถัดไป", ["พื้นที่ (ไร่)", "ลงทะเบียนแล้ว", "มีผู้ใช้แล้ว", "เดาง่าย", "สองช่องไม่ตรงกัน", "ระบบยังไม่พร้อม", "เชื่อมต่อ", "ลองใหม่"], 45)
            out("DIAG register result=\(r ?? "timeout")")
            if r == "พื้นที่ (ไร่)" { out("USED_PHONE \(ph)"); registered = true; break }
            if r == "ลงทะเบียนแล้ว" || r == "มีผู้ใช้แล้ว" { out("TAKEN_PHONE \(ph)"); pause(1.0); continue }
            diag("register failed"); XCTFail("register failed: \(r ?? "timeout")"); return
        }
        if !registered { XCTFail("all phones taken"); return }

        // step 2/3 plot
        pause(0.8); toTop(); shot("05-register-plot")
        typeInto(field(["พื้นที่ (ไร่)"], secure: false), "2", "area")
        hideKeyboard()
        pickDate()
        hideKeyboard()
        var r2 = tapConfirmed("ถัดไป", ["เริ่มใช้งาน", "กรุณาเลือกวันปลูก", "กรุณากรอกพื้นที่"], 40)
        if r2 == "กรุณาเลือกวันปลูก" {
            out("DIAG date retry")
            pickDate(); hideKeyboard()
            r2 = tapConfirmed("ถัดไป", ["เริ่มใช้งาน"], 40)
        }
        if r2 != "เริ่มใช้งาน" { diag("plot step stuck \(r2 ?? "timeout")"); XCTFail("plot step"); return }

        // step 3/3 voice
        pause(1.0); shot("06-register-voice")
        _ = tapConfirmed("เริ่มใช้งาน", ["ข้ามไปก่อน", "ตั้งค่า / ลบบัญชี"], 10)
        let r3 = must(["ข้ามไปก่อน", "ตั้งค่า / ลบบัญชี"], 30, "after voice")
        if r3 == "ข้ามไปก่อน" && !anyContains("ตั้งค่า / ลบบัญชี").firstMatch.exists {
            pause(1.0); shot("07-idcheck")
            tapLabel("ข้ามไปก่อน (ใช้แอปได้ครบ)", types: [.link, .button])
        }

        // home
        _ = must(["ตั้งค่า / ลบบัญชี"], 30, "home")
        pause(2.5); toTop(); shot("10-home")
        scrollPage(up: true); scrollPage(up: true); shot("11-home-scrolled")
        scrollPage(up: true); scrollPage(up: true); shot("11b-home-scrolled-more"); toTop()

        // missions (header bell -> #/missions, else the tile)
        var ok = false
        let bell = app.buttons["แจ้งเตือน"]
        if bell.exists && bell.isHittable { bell.tap(); pause(1.5); ok = true }
        else { ok = tryTap(NSPredicate(format: "label BEGINSWITH 'ภารกิจ'"), "missions tile") }
        if ok && waitAnyText(["ภารกิจและแต้ม"], 15) != nil {
            toTop(); shot("12-missions")
            // lessons from missions
            if tryTap(NSPredicate(format: "label == 'เปิดบทเรียน'"), "open lessons"), waitAnyText(["ผ่านแล้ว", "คะแนน", "ยังไม่ได้ทำแบบทดสอบ", "บทเรียน"], 15) != nil {
                pause(1.5); toTop(); shot("13-lessons")
                // open first lesson
                if tryTap(NSPredicate(format: "label CONTAINS 'ยังไม่ได้ทำแบบทดสอบ' OR label CONTAINS 'คะแนน '"), "first lesson", scrolls: 2) {
                    pause(2.0); shot("14-lesson-detail")
                } else { notReached("14-lesson-detail", "no lesson card") }
            } else { notReached("13-lessons", "เปิดบทเรียน not reachable from missions") }
        } else { notReached("12-missions", "missions page did not open") }
        goHome()

        // wallet tile
        if tryTap(NSPredicate(format: "label BEGINSWITH 'เงิน'"), "wallet tile"), waitAnyText(["รายการล่าสุด", "แต้มของฉัน"], 15) != nil {
            pause(1.0); toTop(); shot("15-wallet")
            // points from wallet
            if tryTap(NSPredicate(format: "label CONTAINS 'แต้มของฉัน'"), "points link"), waitAnyText(["แต้ม"], 10) != nil {
                pause(1.5); toTop(); shot("16-points")
            } else { notReached("16-points", "แต้มของฉัน link not reachable") }
        } else { notReached("15-wallet", "wallet tile not reachable") }
        goHome()
        if !FileManager.default.fileExists(atPath: shotsDir + "/16-points.png") {
            if tryTap(NSPredicate(format: "label CONTAINS 'แต้ม' AND NOT (label BEGINSWITH 'ภารกิจ')"), "points pill", scrolls: 1) {
                pause(1.5); toTop(); shot("16-points"); goHome()
            }
        }

        // game entry (home button under the greeting). 1.11: the bundled game opens INSIDE the app (/game/index.html),
        // back link "กลับหน้าแอป" -> app home. Safari check kept: if the game is not in the app, it is logged, not hidden.
        if tryTap(NSPredicate(format: "label CONTAINS 'เล่นเกมนาข้าว'"), "game button", scrolls: 3) {
            pause(8.0)
            let backQ = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'กลับหน้าแอป'"))
            let inApp = backQ.firstMatch.waitForExistence(timeout: 10)
            out("DIAG game opened in \(inApp ? "RiceOS" : "not RiceOS") app.state=\(app.state.rawValue) safari.state=\(safari.state.rawValue)")
            shot("17-game-entry")
            pause(6.0); shot("18-game-loaded")
            if inApp {
                if let b = firstHittable(backQ) { b.tap() } else { backQ.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
                if waitAnyText(["ตั้งค่า / ลบบัญชี"], 20) != nil { pause(2.0); shot("19-back-from-game") }
                else { out("DIAG after back: game=\(backQ.firstMatch.exists) market=\(anyContains("ตลาดขายข้าว").firstMatch.exists)"); notReached("19-back-from-game", "home not shown 20 s after tapping กลับหน้าแอป") }
            } else {
                notReached("19-back-from-game", "game not inside RiceOS (no กลับหน้าแอป in the app tree)")
                app.activate(); pause(2.0)
            }
        } else { notReached("17-game-entry", "game button not on home") }
        goHome()

        // settings -> delete (cleanup of the test account)
        _ = tapConfirmed("ตั้งค่า / ลบบัญชี", ["ลบบัญชีของฉัน"], 20, types: [.link, .button])
        _ = must(["ลบบัญชีของฉัน"], 20, "settings")
        pause(1.0); toTop(); shot("20-settings")
        _ = tapConfirmed("ลบบัญชีของฉัน", ["ลบบัญชีถาวร?"], 15, types: [.button])
        _ = must(["ลบบัญชีถาวร?"], 15, "delete dialog")
        typeInto(field(["PIN 6 หลัก", "ใส่เลข 6 หลัก"], secure: true, last: true), pin, "delete pin")
        hideKeyboard()
        _ = tapConfirmed("ลบบัญชีของฉันถาวร", ["ลบบัญชีและข้อมูลของท่านเรียบร้อยแล้ว", "PIN ไม่ถูกต้อง"], 30, types: [.button])
        _ = must(["ลบบัญชีและข้อมูลของท่านเรียบร้อยแล้ว"], 30, "delete confirmation")
        out("DELETED_OK")
        shot("21-deleted")
        _ = tapConfirmed("กลับหน้าแรก", ["ลงทะเบียนใช้งาน"], 30, types: [.button])
        _ = must(["ลงทะเบียนใช้งาน"], 30, "register after")
        pause(2.0)

        // login page (no sign-in attempted)
        if tryTap(NSPredicate(format: "label == 'มีบัญชีแล้ว เข้าสู่ระบบ'"), "login link"), waitAnyText(["เข้าสู่ระบบด้วยเบอร์และรหัส PIN"], 15) != nil {
            pause(1.0); toTop(); shot("22-login")
        } else { notReached("22-login", "login link not reachable") }
        out("SHOTS_END")
    }
}
