import XCTest

/// Run with location permission reset first:
///   xcrun simctl privacy booted reset location com.shakeviewer.app
///   xcrun simctl location booted set 35.6812,139.7671   (Tokyo)
final class LocationAndFaultsUITests: XCTestCase {
    @MainActor private var springboard: XCUIApplication { XCUIApplication(bundleIdentifier: "com.apple.springboard") }

    @MainActor
    private func launch(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        // Cached fix in Los Angeles: must NOT be used before permission is granted.
        app.launchArguments = ["-svSeedLocation", "34.05,-118.24", "-svCamera", "20,0,20000000"] + extra
        app.launch()
        sleep(6)
        return app
    }

    @MainActor
    private func camera(_ app: XCUIApplication) -> String { app.staticTexts["debugCamera"].label }

    @MainActor
    private func waitForAlert() -> XCUIElement {
        let alert = springboard.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "Location permission alert did not appear")
        return alert
    }

    @MainActor
    func testA_NoPanWhileAlertThenPanAfterAllow() throws {
        continueAfterFailure = false
        let app = launch()
        let before = camera(app)
        XCTAssertFalse(before.isEmpty)
        app.buttons["Show my location"].tap()
        let alert = waitForAlert()
        sleep(3)
        snap("30-permission-alert-no-pan")
        XCTAssertEqual(camera(app), before, "Camera moved while the permission alert was showing")

        alert.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Allow While'")).firstMatch.tap()
        let moved = NSPredicate { _, _ in
            let parts = self.camera(app).split(separator: ",").compactMap { Double($0) }
            return parts.count == 3 && abs(parts[0] - 35.68) < 1.5 && abs(parts[1] - 139.77) < 1.5 && parts[2] < 2
        }
        expectation(for: moved, evaluatedWith: NSObject())
        waitForExpectations(timeout: 20)
        sleep(2)
        snap("31-after-allow-panned")
    }

    @MainActor
    func testB_DeniedNeverPans() throws {
        continueAfterFailure = false
        let app = launch()
        let before = camera(app)
        app.buttons["Show my location"].tap()
        let alert = waitForAlert()
        sleep(2)
        XCTAssertEqual(camera(app), before)
        let deny = alert.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Don'")).firstMatch
        XCTAssertTrue(deny.exists)
        deny.tap()
        sleep(4)
        snap("33-denied-message")
        XCTAssertEqual(camera(app), before, "Camera moved after permission was denied")
    }

    @MainActor
    func testC_FaultLines() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-svCamera", "15,150,14000000"]
        app.launch()
        sleep(5)
        let toggle = app.buttons["faultLinesToggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        if (toggle.value as? String) == "On" { toggle.tap(); sleep(2) }
        XCTAssertEqual(toggle.value as? String, "Off")
        snap("43-crack-v2-off")
        toggle.tap()
        sleep(4)
        snap("32-fault-lines-on")
        snap("44-crack-v2-on")
        XCTAssertEqual(toggle.value as? String, "On")
    }

    @MainActor
    private func snap(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let att = XCTAttachment(screenshot: shot)
        att.name = name
        att.lifetime = .keepAlways
        add(att)
        if let dir = ProcessInfo.processInfo.environment["SV_SCREENS_DIR"] {
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent(name + ".png"))
        }
    }
}
