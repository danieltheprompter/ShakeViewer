import XCTest

/// Drives the real custom-search flow (draw a rectangle on the map, run search) and saves screenshots.
/// Screens are written to $SV_SCREENS_DIR (set via TEST_RUNNER_SV_SCREENS_DIR) when present.
final class CustomSearchUITests: XCTestCase {
    @MainActor
    func testDrawAreaAndSearch() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-svStart", "2026-09-14", "-svEnd", "2026-10-14", "-svMinMag", "4.0",
                               "-svCamera", "37,139,5200000"]
        app.launch()
        sleep(6)

        // 1. Search entry on the Map tab
        app.navigationBars.buttons["Search"].firstMatch.tap()
        XCTAssertTrue(app.buttons["drawArea"].waitForExistence(timeout: 10))
        sleep(1)
        snap("11-search-sheet")

        // 2. Draw mode
        app.buttons["drawArea"].tap()
        XCTAssertTrue(app.staticTexts["Drag on the map to draw a search area"].waitForExistence(timeout: 10))
        sleep(1)
        snap("12-draw-mode")

        // 3. Real drag on the map
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.22, dy: 0.36))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.80, dy: 0.66))
        start.press(forDuration: 0.2, thenDragTo: end)
        XCTAssertTrue(app.descendants(matching: .any)["boundsSummary"].waitForExistence(timeout: 10))
        sleep(1)
        snap("13-boundary-selected-sheet")

        // 4. Close the sheet to show the rectangle with its corner handles
        app.buttons["Done"].tap()
        sleep(2)
        snap("14-drawn-area-map")

        // 5. Run the search
        app.navigationBars.buttons["Search"].firstMatch.tap()
        let run = app.buttons["runSearch"]
        XCTAssertTrue(run.waitForExistence(timeout: 10))
        sleep(1)
        snap("15-search-sheet-with-area")
        run.tap()
        let pill = app.buttons.matching(NSPredicate(format: "label CONTAINS 'results'")).firstMatch
        XCTAssertTrue(pill.waitForExistence(timeout: 40))
        sleep(3)
        snap("16-results-map")

        app.tabBars.buttons["List"].tap()
        sleep(2)
        snap("17-results-list")
    }

    /// Regression for Daniel's build-1 report: with a quake detail sheet open (the default after tapping
    /// any quake), "Set up custom search" / Search / Filters taps did nothing. Completes a full search.
    @MainActor
    func testSetUpCustomSearchPillWithDetailOpenCompletesSearch() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-svSelectFirst", "YES", "-svCamera", "37,139,5200000",
                               "-svStart", "2026-09-16", "-svEnd", "2026-10-16", "-svMinMag", "3.0"]
        app.launch()
        // Detail sheet up
        XCTAssertTrue(app.descendants(matching: .any)["miniMap"].waitForExistence(timeout: 30))

        // Filters must open even though the detail sheet is showing
        app.navigationBars.buttons["Filters"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 5))
        sleep(2)
        snap("30-filters-from-detail")
        app.swipeDown(velocity: .fast)
        sleep(2)

        // Re-open detail, switch to Custom (auto-opens search sheet) and close it
        app.buttons["Custom"].firstMatch.tap()
        let run = app.buttons["runSearch"]
        XCTAssertTrue(run.waitForExistence(timeout: 10))
        app.buttons["Done"].tap()
        sleep(2)

        // The reported dead tap
        let pill = app.buttons["Set up custom search"]
        XCTAssertTrue(pill.waitForExistence(timeout: 10))
        pill.tap()
        XCTAssertTrue(run.waitForExistence(timeout: 10), "Set up custom search did not open the search sheet")
        snap("31-search-sheet-from-pill")

        // Pick an area by drawing on the map
        app.buttons["drawArea"].tap()
        XCTAssertTrue(app.staticTexts["Drag on the map to draw a search area"].waitForExistence(timeout: 10))
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.40))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.78))
        start.press(forDuration: 0.2, thenDragTo: end)
        XCTAssertTrue(app.descendants(matching: .any)["boundsSummary"].waitForExistence(timeout: 10))
        snap("32-area-selected")

        // Run search: USGS/EMSC must return results
        run.tap()
        // Sheet closes only when the search succeeded with results (errors keep it open).
        XCTAssertTrue(run.waitForNonExistence(timeout: 60), "search did not complete with results")
        let results = app.buttons.matching(NSPredicate(format: "label CONTAINS ' results'")).firstMatch
        XCTAssertTrue(results.waitForExistence(timeout: 10))
        print("CUSTOM_RESULTS_LABEL:", results.label)
        sleep(2)
        snap("33-custom-results")
        XCTAssertFalse(results.label.hasPrefix("0 results"), "search returned no results: \(results.label)")

        // Tap a result quake (opens detail), then the results pill must still reopen the search sheet
        app.tabBars.buttons["List"].tap()
        sleep(2)
        app.cells.firstMatch.tap()
        sleep(2)
        app.tabBars.buttons["Map"].tap()
        sleep(1)
        app.buttons.matching(NSPredicate(format: "label CONTAINS ' results'")).firstMatch.tap()
        XCTAssertTrue(run.waitForExistence(timeout: 10), "results pill dead while detail open")
        snap("34-reopen-from-pill")
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
