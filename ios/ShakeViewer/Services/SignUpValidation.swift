import Foundation

/// Client-side checks for the sign-up form. The Firebase project's own password
/// policy (a console setting) is still enforced server-side.
enum SignUpValidation {
    static let minPasswordLength = 8

    struct PasswordRule: Identifiable, Sendable {
        let id: String
        let label: String
        let isMet: Bool
    }

    static func passwordRules(_ pw: String) -> [PasswordRule] {
        [
            PasswordRule(id: "length", label: "At least \(minPasswordLength) characters", isMet: pw.count >= minPasswordLength),
            PasswordRule(id: "letter", label: "At least one letter", isMet: pw.contains { $0.isLetter }),
            PasswordRule(id: "number", label: "At least one number", isMet: pw.contains { $0.isNumber }),
        ]
    }

    static func isPasswordValid(_ pw: String) -> Bool { passwordRules(pw).allSatisfy(\.isMet) }

    enum Strength: Int, Sendable { case weak, fair, good, strong
        var label: String {
            switch self { case .weak: "Weak"; case .fair: "Fair"; case .good: "Good"; case .strong: "Strong" }
        }
    }

    static func strength(_ pw: String) -> Strength {
        guard isPasswordValid(pw) else { return .weak }
        var score = 0
        if pw.count >= 12 { score += 1 }
        if pw.contains(where: { $0.isUppercase }) && pw.contains(where: { $0.isLowercase }) { score += 1 }
        if pw.contains(where: { !$0.isLetter && !$0.isNumber }) { score += 1 }
        switch score { case 0: return .fair; case 1: return .good; default: return .strong }
    }

    static func normalizedEmail(_ s: String) -> String { s.trimmingCharacters(in: .whitespacesAndNewlines) }

    static func isEmailValid(_ s: String) -> Bool {
        let e = normalizedEmail(s)
        guard e.count <= 254 else { return false }
        return e.range(of: #"^[A-Z0-9a-z._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$"#,
                       options: .regularExpression) != nil
    }
}
