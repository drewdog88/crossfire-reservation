import SwiftUI

@MainActor final class WeekState: ObservableObject {
    @Published var offset = 1

    init() {
        #if DEBUG
        if let o = Config.env("CROSSFIRE_WEEK_OFFSET"), let v = Int(o) {
            offset = v
        }
        #endif
    }
}
