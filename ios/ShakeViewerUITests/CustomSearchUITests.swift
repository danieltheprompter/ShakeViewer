import XCTest

/// Drives the real custom-search flow (draw a rectangle on the map, run search) and saves screenshots.
/// Screens are written to $SV_SCREENS_DIR (set via TEST_RUNNER_SV_SCREENS_DIR) when present.
final class CustomSearchUITests: XCTestCase {
    private func launch(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-svCamera", "37,139,5200000",
                               "-svStart", "2026-09-16", "-svEnd", "2026-10-16", "-svMinMag", "4.0"] + extra
        app.launch()
        return app
    }

    /// Asserts the search sheet stays closed for `seconds` (catches delayed/looping re-presentation).
    private func assertSheetStaysClosed(_ app: XCUIApplication, _ seconds: UInt32, _ msg: String) {
        for _ in 0..<seconds {
            XCTAssertFalse(app.buttons["runSearch"].exists, msg)
            sleep(1)
        }
        XCTAssertFalse(app.buttons["runSearch"].exists, msg)
    }

    private func drag(_ app: XCUIApplication, _ a: CGVector, _ b: CGVector) {
        app.coordinate(withNormalizedOffset: a).press(forDuration: 0.2, thenDragTo: app.coordinate(withNormalizedOffset: b))
    }

    /// Daniel's build-2 report: Custom popped the sheet unexpectedly, and drawing an area kept re-opening it.
    @MainActor
    func testCalmCustomSearchFlow() throws {
        continueAfterFailure = false
        let app = launch()
        XCTAssertTrue(app.buttons["Custom"].firstMatch.waitForExistence(timeout: 20))
        sleep(4)
        snap("01-map-day")

        // 1. Selecting Custom must NOT present the sheet; the pill appears instead.
        app.buttons["Custom"].firstMatch.tap()
        assertSheetStaysClosed(app, 3, "search sheet auto-presented after selecting Custom")
        let pill = app.buttons["Set up custom search"]
        XCTAssertTrue(pill.waitForExistence(timeout: 5))
        snap("02-custom-selected-pill")

        // 2. Explicit tap opens it once.
        pill.tap()
        XCTAssertTrue(app.buttons["runSearch"].waitForExistence(timeout: 10))
        sleep(1)
        snap("03-sheet-from-pill")

        // 3. Draw mode: sheet hidden, banner with Cancel / Done (Done disabled until drawn).
        app.buttons["drawArea"].tap()
        XCTAssertTrue(app.buttons["drawDone"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["drawDone"].isEnabled)
        XCTAssertTrue(app.buttons["drawCancel"].exists)
        assertSheetStaysClosed(app, 2, "sheet visible during draw mode")
        snap("04-draw-mode-banner")

        // 4. Draw (twice): the sheet must NOT come back by itself.
        drag(app, CGVector(dx: 0.20, dy: 0.40), CGVector(dx: 0.70, dy: 0.62))
        assertSheetStaysClosed(app, 3, "sheet re-presented after drawing an area")
        drag(app, CGVector(dx: 0.15, dy: 0.38), CGVector(dx: 0.85, dy: 0.72))
        assertSheetStaysClosed(app, 3, "sheet re-presented after redrawing an area")
        XCTAssertTrue(app.buttons["drawDone"].isEnabled)
        snap("05-area-drawn-awaiting-done")

        // 5. Done returns to the sheet exactly once, with the area set.
        app.buttons["drawDone"].tap()
        XCTAssertTrue(app.buttons["runSearch"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["boundsSummary"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["drawDone"].exists)
        sleep(1)
        snap("06-back-in-sheet-with-area")

        // 6. Run search: sheet closes, results show, and nothing re-presents.
        app.buttons["runSearch"].tap()
        XCTAssertTrue(app.buttons["runSearch"].waitForNonExistence(timeout: 60), "search did not complete")
        let results = app.buttons.matching(NSPredicate(format: "label CONTAINS ' results'")).firstMatch
        XCTAssertTrue(results.waitForExistence(timeout: 10))
        print("CUSTOM_RESULTS_LABEL:", results.label)
        assertSheetStaysClosed(app, 4, "sheet re-presented after running search")
        snap("07-results")

        // 7. Leaving and re-selecting Custom (already configured) must not open the sheet.
        app.buttons["24h"].firstMatch.tap()
        sleep(2)
        app.buttons["Custom"].firstMatch.tap()
        assertSheetStaysClosed(app, 3, "sheet auto-presented re-selecting configured Custom")
        snap("08-custom-reselected-no-sheet")

        // 8. Toolbar Search still opens it on demand.
        app.navigationBars.buttons["Search"].firstMatch.tap()
        XCTAssertTrue(app.buttons["runSearch"].waitForExistence(timeout: 10))
        snap("09-search-button-opens-sheet")
    }

    @MainActor
    func testCancelDrawingReturnsToSheetOnce() throws {
        continueAfterFailure = false
        let app = launch(["-svOpenSearch", "YES"])
        XCTAssertTrue(app.buttons["drawArea"].waitForExistence(timeout: 20))
        app.buttons["drawArea"].tap()
        XCTAssertTrue(app.buttons["drawCancel"].waitForExistence(timeout: 10))
        drag(app, CGVector(dx: 0.2, dy: 0.4), CGVector(dx: 0.7, dy: 0.6))
        assertSheetStaysClosed(app, 2, "sheet re-presented after drawing")
        app.buttons["drawCancel"].tap()
        XCTAssertTrue(app.buttons["runSearch"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.descendants(matching: .any)["boundsSummary"].exists, "cancelled draft was applied")
        snap("10-cancel-back-to-sheet")
        app.buttons["Done"].tap()
        assertSheetStaysClosed(app, 4, "sheet re-presented after closing")
    }

    /// Build-1 regression: with a quake detail open, Search / Filters / pill must still work.
    @MainActor
    func testSheetsOpenWhileDetailShown() throws {
        continueAfterFailure = false
        let app = launch(["-svSelectFirst", "YES"])
        XCTAssertTrue(app.descendants(matching: .any)["miniMap"].waitForExistence(timeout: 30))
        app.navigationBars.buttons["Filters"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 5))
        sleep(2)
        app.swipeDown(velocity: .fast)
        sleep(2)
        app.buttons["Custom"].firstMatch.tap()
        assertSheetStaysClosed(app, 2, "auto-presented on Custom")
        app.buttons["Set up custom search"].tap()
        XCTAssertTrue(app.buttons["runSearch"].waitForExistence(timeout: 10), "pill dead")
        snap("11-pill-from-detail")
    }

    @MainActor
    func testMiniMapOpensFullMap() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-svTab", "list", "-svSelectFirst", "YES"]
        app.launch()
        let mini = app.descendants(matching: .any)["miniMap"]
        XCTAssertTrue(mini.waitForExistence(timeout: 30))
        sleep(1)
        snap("20-detail-from-list")
        mini.tap()
        sleep(3)
        XCTAssertTrue(app.tabBars.buttons["Map"].isSelected)
        snap("21-minimap-to-full-map")
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
