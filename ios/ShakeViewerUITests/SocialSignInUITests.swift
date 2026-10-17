import XCTest

/// Social sign-in can't complete in the simulator, but the buttons must render above the email form
/// (Apple first, at least as prominent as Google), the consent notice must show, and the Apple sheet must appear.
final class SocialSignInUITests: XCTestCase {
    @MainActor
    func testSocialButtonsRenderAndAppleSheetAppears() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-svTab", "settings", "-svNoAutofill"]
        app.launch()
        let signIn = app.buttons["Sign in / Create account"]
        guard signIn.waitForExistence(timeout: 10) else { throw XCTSkip("Accounts not available") }
        signIn.tap()
        let apple = app.buttons["signInWithApple"]
        let google = app.buttons["signInWithGoogle"]
        XCTAssertTrue(apple.waitForExistence(timeout: 5), "Apple button missing")
        XCTAssertTrue(google.waitForExistence(timeout: 5), "Google button missing")
        XCTAssertLessThan(apple.frame.minY, google.frame.minY, "Apple button should be first")
        XCTAssertGreaterThanOrEqual(apple.frame.height, google.frame.height - 0.5, "Apple button must be at least as prominent")
        let email = app.textFields["Email"]
        XCTAssertTrue(email.exists)
        XCTAssertLessThan(google.frame.maxY, email.frame.minY, "social buttons should be above the email form")
        XCTAssertTrue(app.descendants(matching: .any)["socialTermsNotice"].exists, "consent notice missing")
        snap(app, "70-social-signin")
        app.buttons["Create account"].firstMatch.tap()
        XCTAssertTrue(apple.waitForExistence(timeout: 3))
        snap(app, "71-social-create-account")

        apple.tap()
        // The system Apple ID sheet (or the "sign in to your Apple Account" prompt on an unsigned simulator)
        // is presented by another process; detect it via SpringBoard/AuthKit UI or the app losing foreground focus.
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let authUI = XCUIApplication(bundleIdentifier: "com.apple.AuthKitUIService")
        let deadline = Date().addingTimeInterval(10)
        var appeared = false
        while Date() < deadline && !appeared {
            appeared = authUI.state == .runningForeground
                || springboard.alerts.count > 0 || springboard.sheets.count > 0
                || app.sheets.count > 0 || app.alerts.count > 0
                || springboard.buttons["Continue"].exists || springboard.buttons["Settings"].exists
            if !appeared { usleep(300_000) }
        }
        sleep(1)
        let shot = XCUIScreen.main.screenshot()
        let a = XCTAttachment(screenshot: shot); a.name = "72-apple-sheet"; a.lifetime = .keepAlways; add(a)
        if let dir = ProcessInfo.processInfo.environment["SV_SCREENS_DIR"] {
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("72-apple-sheet.png"))
        }
        XCTAssertTrue(appeared, "Sign in with Apple UI did not appear")
    }

    @MainActor
    private func snap(_ app: XCUIApplication, _ name: String) {
        let shot = app.screenshot()
        let a = XCTAttachment(screenshot: shot); a.name = name; a.lifetime = .keepAlways; add(a)
        if let dir = ProcessInfo.processInfo.environment["SV_SCREENS_DIR"] {
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent(name + ".png"))
        }
    }
}
