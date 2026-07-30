import SwiftUI

@main
struct CrossfireApp: App {
    @StateObject private var session = Session()
    @StateObject private var week = WeekState()

    init() {
        if Config.env("CROSSFIRE_SELFTEST") == "1" {
            runSelfTests()
            runModelSelfTests()
        }
    }
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(week)
                .task { await session.bootstrap() }
        }
    }
}
