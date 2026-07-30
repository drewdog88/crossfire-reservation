import SwiftUI

@MainActor final class Session: ObservableObject {
    enum Phase { case loading, ready }
    @Published var phase: Phase = .loading
    @Published var user: User?
    @Published var catalog = Catalog(teams: [], locations: [], fields: [], slots: [])
    var isAdmin: Bool { user?.role == .admin }

    func bootstrap() async {
        async let cat = try? APIClient.shared.bootstrap()
        async let who = try? APIClient.shared.me()
        if let c = await cat { catalog = c }
        user = (await who) ?? nil
        phase = .ready
    }
    func login(email: String, password: String) async throws {
        user = try await APIClient.shared.login(email: email, password: password)
        catalog = (try? await APIClient.shared.bootstrap()) ?? catalog
    }
    func register(firstName: String, lastName: String, email: String, password: String) async throws {
        try await APIClient.shared.register(firstName: firstName, lastName: lastName, email: email, password: password)
    }
    func logout() async { try? await APIClient.shared.logout(); user = nil }
    func refreshCatalog() async { catalog = (try? await APIClient.shared.bootstrap()) ?? catalog }
}
