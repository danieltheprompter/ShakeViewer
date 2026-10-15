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
        XCTAssertTrue(app.buttons["Draw search area"].waitForExistence(timeout: 10))
        sleep(1)
        snap("11-search-sheet")

        // 2. Draw mode
        app.buttons["Draw search area"].tap()
        XCTAssertTrue(app.staticTexts["Drag on the map to draw a search area"].waitForExistence(timeout: 10))
        sleep(1)
        snap("12-draw-mode")

        // 3. Real drag on the map
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.22, dy: 0.36))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.80, dy: 0.66))
        start.press(forDuration: 0.2, thenDragTo: end)
        XCTAssertTrue(app.buttons["Boundary selected · redraw"].waitForExistence(timeout: 10))
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
