import XCTest

final class LegalUITests: XCTestCase {
    @MainActor
    func testPrivacyTermsAboutReachable() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-svTab", "settings"]
        app.launch()
        let privacy = app.buttons["privacyPolicy"]
        XCTAssertTrue(privacy.waitForExistence(timeout: 10))
        app.swipeUp()
        snap(app, "50-settings-legal")
        privacy.tap()
        XCTAssertTrue(app.staticTexts["Retention and deletion"].waitForExistence(timeout: 5))
        snap(app, "51-privacy-policy")
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.buttons["About ShakeViewer"].tap()
        XCTAssertTrue(app.otherElements["disclaimer"].waitForExistence(timeout: 5) || app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'not an earthquake early-warning'")).firstMatch.exists)
        snap(app, "52-about")
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
