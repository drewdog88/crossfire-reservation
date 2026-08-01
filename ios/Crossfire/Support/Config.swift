import Foundation

enum Config {
    static func env(_ key: String) -> String? {
        let v = ProcessInfo.processInfo.environment[key]
        return (v?.isEmpty == false) ? v : nil
    }
    static var apiBaseURL: URL {
        if let override = env("CROSSFIRE_API_BASE"), let u = URL(string: override) { return u }
        return URL(string: "https://crossfire-reservation.vercel.app")!
    }
}
