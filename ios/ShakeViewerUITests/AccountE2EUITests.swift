import XCTest

/// End-to-end account test against the real Firebase project. Only runs when SV_E2E_EMAIL / SV_E2E_PASSWORD are set
/// (pass via TEST_RUNNER_SV_E2E_EMAIL etc.). Uses a throwaway account; never touches other users.
final class AccountE2EUITests: XCTestCase {
    private var env: [String: String] { ProcessInfo.processInfo.environment }

    @MainActor
    func testE2E_1_SignUpAndBookmark() throws {
        guard let email = env["SV_E2E_EMAIL"], let pw = env["SV_E2E_PASSWORD"] else { throw XCTSkip("no E2E creds") }
        let app = XCUIApplication()
        app.launchArguments = ["-svTab", "settings", "-svNoAutofill"]
        app.launch()
        let signIn = app.buttons["Sign in / Create account"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 10), "Accounts not available (plist missing?)")
        signIn.tap()
        app.buttons["Create account"].firstMatch.tap()
        let name = app.textFields["Name"]; XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("SV E2E")
        let mail = app.textFields["Email"]; mail.tap(); mail.typeText(email)
        let pass = app.secureTextFields["Password"]; pass.tap()
        let own = app.buttons["Choose My Own Password"]
        if own.waitForExistence(timeout: 2) { own.tap(); pass.tap() }
        pass.typeText(pw)
        let sw = app.switches.firstMatch
        sw.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        if (sw.value as? String) != "1" { sw.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap() }
        // the submit button (last "Create account" button)
        let buttons = app.buttons.matching(identifier: "Create account")
        let a = buttons.element(boundBy: 0), b = buttons.element(boundBy: 1)
        (a.frame.minY > b.frame.minY ? a : b).tap()
        let ok = app.staticTexts["Signed in"].waitForExistence(timeout: 20)
        if !ok { snap(app, "60-e2e-FAIL") }
        XCTAssertTrue(ok, "sign-up failed")
        snap(app, "60-e2e-signed-in")
        app.terminate()

        app.launchArguments = ["-svTab", "list", "-svSelectFirst", "YES"]
        app.launch()
        let bm = app.buttons["Bookmark"]
        XCTAssertTrue(bm.waitForExistence(timeout: 30))
        bm.tap()
        XCTAssertTrue(app.buttons["Saved"].waitForExistence(timeout: 10))
        sleep(4) // let Firestore flush the write
        snap(app, "61-e2e-bookmarked")
    }

    @MainActor
    func testE2E_2_DeleteAccount() throws {
        guard let pw = env["SV_E2E_PASSWORD"] else { throw XCTSkip("no E2E creds") }
        let app = XCUIApplication()
        app.launchArguments = ["-svTab", "settings", "-svNoAutofill"]
        app.launch()
        let del = app.buttons["deleteAccount"]
        XCTAssertTrue(del.waitForExistence(timeout: 15), "not signed in")
        del.tap()
        let f = app.secureTextFields["deletePassword"]; XCTAssertTrue(f.waitForExistence(timeout: 5)); f.tap(); f.typeText(pw)
        app.buttons["confirmDeleteAccount"].tap()
        let confirm = app.buttons["Delete account"].firstMatch
        XCTAssertTrue(confirm.waitForExistence(timeout: 5)); confirm.tap()
        XCTAssertTrue(app.buttons["Sign in / Create account"].waitForExistence(timeout: 30), "account not deleted")
        snap(app, "62-e2e-deleted")
    }

    @MainActor
    private func snap(_ app: XCUIApplication, _ name: String) {
        let shot = app.screenshot()
        let a = XCTAttachment(screenshot: shot); a.name = name; a.lifetime = .keepAlways; add(a)
        if let dir = env["SV_SCREENS_DIR"] {
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent(name + ".png"))
        }
    }
}
