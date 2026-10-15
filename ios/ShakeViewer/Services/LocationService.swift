import CoreLocation

/// Location access with strict permission gating:
/// nothing is requested from CoreLocation (and the caller gets nothing back) until the user has
/// granted When-In-Use/Always. While the system prompt is up we simply await the decision.
@MainActor
final class LocationService: NSObject, CLLocationManagerDelegate {
    enum Authorization: Sendable { case authorized, denied, notDetermined }

    private let manager = CLLocationManager()
    private var fixContinuation: CheckedContinuation<Coordinate?, Never>?
    private var authContinuation: CheckedContinuation<Bool, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    var authorization: Authorization { Self.map(manager.authorizationStatus) }

    private nonisolated static func map(_ s: CLAuthorizationStatus) -> Authorization {
        switch s {
        case .authorizedAlways, .authorizedWhenInUse: .authorized
        case .notDetermined: .notDetermined
        default: .denied
        }
    }

    /// Shows the system prompt if needed and waits for the user's answer.
    func ensureAuthorized() async -> Bool {
        switch authorization {
        case .authorized: return true
        case .denied: return false
        case .notDetermined:
            if authContinuation != nil { return false }
            return await withCheckedContinuation { cont in
                authContinuation = cont
                manager.requestWhenInUseAuthorization()
            }
        }
    }

    /// One fresh fix. Returns nil without touching CoreLocation unless already authorized.
    func requestLocation() async -> Coordinate? {
        guard authorization == .authorized, fixContinuation == nil else { return nil }
        return await withCheckedContinuation { cont in
            fixContinuation = cont
            manager.requestLocation()
        }
    }

    private func finishFix(_ c: Coordinate?) {
        fixContinuation?.resume(returning: c)
        fixContinuation = nil
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let auth = Self.map(manager.authorizationStatus)
        Task { @MainActor in
            // Fires once on creation and again when the prompt is shown; only a real decision resumes.
            guard auth != .notDetermined, let cont = self.authContinuation else { return }
            self.authContinuation = nil
            cont.resume(returning: auth == .authorized)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let c = locations.last.map { Coordinate(latitude: $0.coordinate.latitude, longitude: $0.coordinate.longitude) }
        Task { @MainActor in self.finishFix(c) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finishFix(nil) }
    }
}
