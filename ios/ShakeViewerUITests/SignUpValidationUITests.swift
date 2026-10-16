import XCTest

final class SignUpValidationUITests: XCTestCase {
    func testMismatchDisablesSubmit() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-svTab", "settings", "-svNoAutofill"]
        app.launch()
        let signIn = app.buttons["Sign in / Create account"]
        guard signIn.waitForExistence(timeout: 10) else { throw XCTSkip("Accounts not available") }
        signIn.tap()
        app.buttons["Create account"].firstMatch.tap()
        let mail = app.textFields["Email"]; XCTAssertTrue(mail.waitForExistence(timeout: 5))
        mail.tap(); mail.typeText("  someone@example.com ")
        // Reveal passwords first: plain text fields don't trigger the simulator's strong-password sheet.
        let toggle = app.buttons["togglePasswordVisibility"]; XCTAssertTrue(toggle.waitForExistence(timeout: 3))
        toggle.tap()
        let pass = app.textFields["Password"]; XCTAssertTrue(pass.waitForExistence(timeout: 3))
        pass.tap(); pass.typeText("abc12345")
        let confirm = app.textFields["Confirm password"]; confirm.tap(); confirm.typeText("abc12346")
        XCTAssertTrue(app.descendants(matching: .any)["passwordMismatch"].waitForExistence(timeout: 3), "no mismatch message")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "At least one number, met")).firstMatch.exists)
        app.swipeUp(); app.swipeUp()
        let submit = app.buttons.matching(NSPredicate(format: "label == 'Create account'")).allElementsBoundByIndex
            .max { $0.frame.minY < $1.frame.minY }
        XCTAssertNotNil(submit)
        XCTAssertFalse(submit?.isEnabled ?? true, "submit should be disabled")
    }
}
