import SwiftUI

@main
struct CrossfireApp: App {
    init() { if Config.env("CROSSFIRE_SELFTEST") == "1" { runSelfTests() } }
    var body: some Scene {
        WindowGroup { RootView() }
    }
}
