import XCTest

// Drives the installed RiceOS app (Capacitor WebView) through: launch -> notice -> PDPA consent -> register
// -> home -> settings -> delete account -> confirmation (6 s) -> กลับหน้าแรก -> register page.
// Env (via TEST_RUNNER_ prefix): REC_PIN (6 digits, masked in CI), REC_PHONES (comma list, tried in order if taken).
// Prints "REC_MARK <step> <epoch>" lines so the workflow can cut frames; never prints the PIN.
final class RecordDeleteTests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.donaus.riceos")
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    func out(_ s: String) {
        FileHandle.standardOutput.write((s + "\n").data(using: .utf8)!)
        if !s.hasPrefix("DIAG"), let path = ProcessInfo.processInfo.environment["REC_MARKS_FILE"], let d = (s + "\n").data(using: .utf8) {
            if let h = FileHandle(forWritingAtPath: path) { h.seekToEndOfFile(); h.write(d); h.closeFile() }
            else { try? d.write(to: URL(fileURLWithPath: path)) }
        }
    }
    func mark(_ step: String) {
        out("REC_MARK \(step) " + String(format: "%.3f", Date().timeIntervalSince1970))
    }
    func pause(_ s: Double) { Thread.sleep(forTimeInterval: s) }

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
    func diag(_ why: String) {
        out("DIAG \(why)")
        out(app.debugDescription)
    }
    func must(_ labels: [String], _ timeout: Double, _ why: String) -> String {
        if let l = waitAnyText(labels, timeout) { return l }
        diag("missing \(labels) at \(why)")
        XCTFail("missing \(labels) at \(why)")
        return ""
    }

    // ---------- gestures ----------
    func scrollPage(up: Bool) {
        let wv = app.webViews.firstMatch
        guard wv.exists else { return }
        let a = wv.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: up ? 0.70 : 0.30))
        let b = wv.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: up ? 0.35 : 0.65))
        a.press(forDuration: 0.05, thenDragTo: b)
        pause(0.6)
    }
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
        // tap a neutral heading
        for t in ["ลงทะเบียนใช้งาน", "ยืนยันแปลง", "สร้างบัญชีและ PIN", "ลบบัญชีถาวร?"] {
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
    func tapLabel(_ label: String, types: [XCUIElement.ElementType] = [.button, .link]) {
        for t in types {
            let e = app.descendants(matching: t).matching(NSPredicate(format: "label == %@", label)).firstMatch
            if e.exists { tapEl(e, label); return }
        }
        let e = anyExact(label).firstMatch
        if !e.waitForExistence(timeout: 10) {
            for t in types {
                let e2 = app.descendants(matching: t).matching(NSPredicate(format: "label == %@", label)).firstMatch
                if e2.exists { tapEl(e2, label); return }
            }
        }
        tapEl(e, label)
    }
    // Run 45010310882: one XCUITest tap on the WebView "ถัดไป →" never reached the DOM (button never showed
    // "กำลังส่ง...", no error, 60 s unchanged). Tap, then confirm the page reacted (busy label or an expected
    // result); if not, settle and re-tap (element, then coordinate), at most 4 taps, then wait for the result.
    func tapConfirmed(_ label: String, _ until: [String], _ timeout: Double) -> String? {
        let reacted = ["กำลังส่ง..."] + until
        for attempt in 0..<4 {
            hideKeyboard()
            let b = app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch
            if !b.exists { if let r = waitAnyText(until, 2) { return r } }
            if b.exists {
                let end = Date().addingTimeInterval(5)
                while !(b.isHittable && b.isEnabled) && Date() < end { pause(0.3) }
            }
            if attempt % 2 == 0 && b.exists && b.isHittable { b.tap() }
            else if b.exists { b.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
            else { tapLabel(label) }
            if let r = waitAnyText(reacted, 5) {
                if attempt > 0 { out("DIAG \(label) reacted after tap \(attempt + 1)") }
                if r != "กำลังส่ง..." { return r }
                return waitAnyText(until, timeout)
            }
            out("DIAG \(label) tap \(attempt + 1) not received, retry")
            pause(1.0)
        }
        return waitAnyText(until, timeout)
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
                out("DIAG date buttons=\(btns.count) day=\(dayBtns.count) sample=\(btns.prefix(6).map { $0.label })")
                let digitBtns = btns.filter { b in b.label.range(of: "\\d", options: .regularExpression) != nil && !b.label.lowercased().contains("month") }
                if let d = dayBtns.first ?? (digitBtns.count > 2 ? digitBtns[2] : digitBtns.first) { d.tap(); pause(1.0) }
            }
        } else {
            out("DIAG no datePicker after tap")
        }
        // commit / close the picker
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

    func testRecordDeleteAccount() throws {
        let env = ProcessInfo.processInfo.environment
        let pin = env["REC_PIN"] ?? ""
        XCTAssertEqual(pin.count, 6, "REC_PIN must be 6 digits")
        let phones = (env["REC_PHONES"] ?? "0899123409").split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }

        addUIInterruptionMonitor(withDescription: "system alerts") { alert in
            for b in ["Allow While Using App", "Allow Once", "Allow", "OK", "อนุญาตขณะใช้แอป", "อนุญาต", "ตกลง", "Not Now"] {
                if alert.buttons[b].exists { alert.buttons[b].tap(); return true }
            }
            return false
        }

        // 01 launch from the home screen
        XCUIDevice.shared.press(.home)
        pause(2.5)
        mark("springboard")
        pause(1.5)
        let icon = springboard.icons["RiceOS"]
        mark("launch")
        if icon.waitForExistence(timeout: 3) && icon.isHittable { icon.tap() } else { out("DIAG icon not on page 1, activate()"); app.activate() }
        _ = app.wait(for: .runningForeground, timeout: 20)

        // 02 notice sheet
        _ = must(["ข้อควรทราบ / Notice"], 45, "notice")
        pause(0.8); mark("notice"); pause(2.0)
        tapLabel("ตกลง / OK")

        // 03 PDPA consent
        _ = must(["ความยินยอม (PDPA)"], 20, "consent")
        pause(0.5); mark("consent"); pause(1.5)
        var agree = app.buttons["ยินยอมและเริ่มลงทะเบียน"]
        let ageQs: [XCUIElementQuery] = [
            app.switches.matching(NSPredicate(format: "label BEGINSWITH 'ฉันอายุ 20'")),
            app.checkBoxes.matching(NSPredicate(format: "label BEGINSWITH 'ฉันอายุ 20'")),
            app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'ฉันอายุ 20' AND elementType != %lu", XCUIElement.ElementType.other.rawValue)),
            app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'ฉันอายุ 20'"))
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

        // 04 register: name, phone, PIN x2
        _ = must(["สร้างบัญชีและ PIN"], 20, "register")
        pause(0.5); mark("register_page")
        let nm = field(["ชื่อที่ใช้แสดง", "เช่น ลุงสมชาย"], secure: false)
        typeInto(nm, "บัญชีตัวอย่าง", "name")
        if !((nm.value as? String) ?? "").contains("บัญชี") {
            out("DIAG thai name not typed, using ASCII")
            typeInto(nm, "Demo account", "name", clear: true)
        }
        var registered = false
        for (i, ph) in phones.enumerated() {
            let pf = field(["เบอร์มือถือ (10 หลัก)", "0812345678"], secure: false)
            typeInto(pf, ph, "phone", clear: i > 0)
            if i == 0 {
                typeInto(field(["PIN 6 หลัก (ใช้เข้าแอป)"], secure: true), pin, "pin1")
                typeInto(field(["ใส่ PIN อีกครั้ง"], secure: true, last: true), pin, "pin2")
            }
            hideKeyboard()
            pause(0.5); mark("register_filled"); pause(1.0)
            out("TRY_PHONE \(ph)")
            let r = tapConfirmed("ถัดไป →", ["พื้นที่ (ไร่)", "ลงทะเบียนแล้ว", "มีผู้ใช้แล้ว", "PIN เดาง่าย", "PIN สองช่อง", "ระบบยังไม่พร้อม", "เชื่อมต่อ", "ลองใหม่"], 45)
            out("DIAG register result=\(r ?? "timeout")")
            if r == "พื้นที่ (ไร่)" { out("USED_PHONE \(ph)"); registered = true; break }
            if r == "ลงทะเบียนแล้ว" || r == "มีผู้ใช้แล้ว" { out("TAKEN_PHONE \(ph)"); pause(1.0); continue }
            diag("register failed"); XCTFail("register failed: \(r ?? "timeout")"); return
        }
        if !registered { XCTFail("all phones taken"); return }

        // step 2/3 plot: area 2, sow date, kratong 1 (default)
        pause(0.8); mark("plot")
        typeInto(field(["พื้นที่ (ไร่)"], secure: false), "2", "area")
        hideKeyboard()
        pickDate()
        hideKeyboard()
        mark("plot_filled")
        var r2 = tapConfirmed("ถัดไป →", ["เริ่มใช้งาน ✓", "กรุณาเลือกวันปลูก", "กรุณากรอกพื้นที่"], 40)
        if r2 == "กรุณาเลือกวันปลูก" {
            out("DIAG date retry")
            pickDate(); hideKeyboard()
            r2 = tapConfirmed("ถัดไป →", ["เริ่มใช้งาน ✓"], 40)
        }
        if r2 != "เริ่มใช้งาน ✓" { diag("plot step stuck \(r2 ?? "timeout")"); XCTFail("plot step"); return }

        // step 3/3 voice
        pause(1.0); mark("voice")
        _ = tapConfirmed("เริ่มใช้งาน ✓", ["ข้ามไปก่อน", "ตั้งค่า / ลบบัญชี"], 10)
        let r3 = must(["ข้ามไปก่อน", "ตั้งค่า / ลบบัญชี"], 30, "after voice")
        if r3 == "ข้ามไปก่อน" && !anyContains("ตั้งค่า / ลบบัญชี").firstMatch.exists {
            pause(1.0)
            tapLabel("ข้ามไปก่อน (ใช้แอปได้ครบ)", types: [.link, .button])
        }

        // 05 home
        _ = must(["ตั้งค่า / ลบบัญชี"], 30, "home")
        pause(1.5); mark("home"); pause(2.0)
        tapLabel("ตั้งค่า / ลบบัญชี", types: [.link, .button])

        // settings -> delete
        _ = must(["ลบบัญชีของฉัน"], 20, "settings")
        pause(1.0); mark("settings"); pause(1.0)
        tapLabel("ลบบัญชีของฉัน", types: [.button])
        _ = must(["ลบบัญชีถาวร?"], 15, "delete dialog")
        pause(0.8); mark("delete_dialog")
        typeInto(field(["PIN 6 หลัก"], secure: true, last: true), pin, "delete pin")
        hideKeyboard()
        pause(0.8); mark("delete_pin"); pause(0.8)
        tapLabel("ลบบัญชีของฉันถาวร", types: [.button])

        // 06/07 confirmation stays on screen
        _ = must(["ลบบัญชีและข้อมูลของคุณเรียบร้อยแล้ว"], 30, "delete confirmation")
        out("DELETED_OK")
        mark("deleted")
        pause(6.0)
        mark("deleted_6s")
        tapLabel("กลับหน้าแรก", types: [.button])

        // 08 register page again
        _ = must(["ลงทะเบียนใช้งาน", "ความยินยอม (PDPA)"], 30, "register after")
        pause(1.0); mark("register_after"); pause(2.5)
        mark("end")
    }
}
