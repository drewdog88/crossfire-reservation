import SwiftUI

@MainActor final class WeekState: ObservableObject {
    @Published var offset = 1
}
