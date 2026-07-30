import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: Session

    var body: some View {
        switch session.phase {
        case .loading:
            VStack(spacing: 16) {
                ProgressView()
                Text("Loading…")
                    .font(Theme.sans(16))
                    .foregroundColor(Theme.ink)
            }
        case .ready:
            MainTabView()
        }
    }
}
