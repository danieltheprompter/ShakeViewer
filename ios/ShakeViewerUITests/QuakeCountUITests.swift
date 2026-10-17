import XCTest

/// "x of y quakes" status line: unfiltered shows "N quakes"; filtered shows "x of y quakes · <filters>"
/// with a Show all button, on both Map and List. Uses the live 24h feed.
final class QuakeCountUITests: XCTestCase {
    private func label(_ app: XCUIApplication) -> String {
        let e = app.buttons["quakeCount"].firstMatch
        XCTAssertTrue(e.waitForExistence(timeout: 20))
        // Wait for the feed to load (label leaves "0 quakes").
        for _ in 0..<30 where e.label.hasPrefix("0 earthquakes") { sleep(1) }
        return e.label
    }

    private func visibleText(_ app: XCUIApplication, _ pred: String) -> XCUIElement {
        app.staticTexts.matching(identifier: "quakeCountText").matching(NSPredicate(format: pred)).firstMatch
    }

    @MainActor
    func testUnfilteredShowsPlainCount() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-svCamera", "20,0,20000000"]
        app.launch()
        let a11y = label(app)
        XCTAssertTrue(a11y.hasSuffix("earthquakes loaded, all shown."), a11y)
        XCTAssertTrue(visibleText(app, "label MATCHES '^[0-9]+ quakes?$'").waitForExistence(timeout: 5), "expected 'N quakes'")
        XCTAssertFalse(app.buttons["showAllQuakes"].exists)
        snap("01-map-unfiltered")
        app.tabBars.buttons["List"].tap()
        XCTAssertTrue(visibleText(app, "label MATCHES '^[0-9]+ quakes?$'").waitForExistence(timeout: 5))
        snap("02-list-unfiltered")
    }

    @MainActor
    func testFilteredShowsXofYAndShowAll() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-svCamera", "20,0,20000000", "-svFilterMinMag", "4.5"]
        app.launch()
        let a11y = label(app)
        XCTAssertTrue(a11y.hasPrefix("Showing "), a11y)
        XCTAssertTrue(a11y.contains("magnitude 4.5 or greater"), a11y)
        let txt = visibleText(app, "label MATCHES '^[0-9]+ of [0-9]+ quakes · M4\\\\.5\\\\+$'")
        XCTAssertTrue(txt.waitForExistence(timeout: 5), "expected 'x of y quakes · M4.5+'")
        XCTAssertTrue(app.buttons["showAllQuakes"].exists)
        snap("03-map-filtered")

        app.buttons["quakeCount"].firstMatch.tap()
        XCTAssertTrue(app.buttons["showAllInfo"].waitForExistence(timeout: 5))
        snap("04-filtered-explanation")
        app.buttons["showAllInfo"].tap()
        XCTAssertTrue(visibleText(app, "label MATCHES '^[0-9]+ quakes?$'").waitForExistence(timeout: 5))
        snap("05-after-show-all")

        // List: same label, Show all button works.
        app.tabBars.buttons["List"].tap()
        XCTAssertTrue(app.buttons["Filters"].firstMatch.waitForExistence(timeout: 5))
        app.terminate()
        app.launchArguments = ["-svTab", "list", "-svFilterMinMag", "4.5", "-svFilterDepth", "shallow"]
        app.launch()
        _ = label(app)
        XCTAssertTrue(visibleText(app, "label MATCHES '^[0-9]+ of [0-9]+ quakes · M4\\\\.5\\\\+, Shallow$'").waitForExistence(timeout: 5))
        snap("06-list-filtered")
        app.buttons["showAllQuakes"].tap()
        XCTAssertTrue(visibleText(app, "label MATCHES '^[0-9]+ quakes?$'").waitForExistence(timeout: 5))
        snap("07-list-after-show-all")
    }

    private func snap(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let a = XCTAttachment(screenshot: shot); a.name = name; a.lifetime = .keepAlways; add(a)
        if let dir = ProcessInfo.processInfo.environment["SV_SCREENS_DIR"] {
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("count-\(name).png"))
        }
    }
}
