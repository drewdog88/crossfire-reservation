import Foundation

// MARK: - Response wrappers

private struct MeResponse: Decodable {
    let user: User
}

private struct LoginResponse: Decodable {
    let user: User
}

private struct SlotResponse: Decodable {
    let slot: SlotConfig
}

private struct SlotsResponse: Decodable {
    let slots: [SlotConfig]
}

private struct GeoResponse: Decodable {
    let lat: Double
    let lon: Double
}

private struct OkResponse: Decodable {
    let ok: Bool
}

// MARK: - AnyEncodable wrapper

private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init<T: Encodable>(_ wrapped: T) {
        _encode = { try wrapped.encode(to: $0) }
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}

// MARK: - APIClient

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init() {
        let cfg = URLSessionConfiguration.default
        cfg.httpCookieStorage = .shared
        cfg.httpCookieAcceptPolicy = .always
        cfg.httpShouldSetCookies = true
        session = URLSession(configuration: cfg)
    }

    // MARK: - Core request

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil, decode: T.Type) async throws -> T {
        var r = URLRequest(url: Config.apiBaseURL.appendingPathComponent("api" + path))
        r.httpMethod = method
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body {
            r.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, resp): (Data, URLResponse)
        do {
            (data, resp) = try await session.data(for: r)
        } catch {
            throw APIError.transport
        }

        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if !(200...299).contains(status) {
            let msg = (try? decoder.decode([String: String].self, from: data))?["error"] ?? "Request failed (\(status))"
            throw APIError.http(status, msg)
        }

        if data.isEmpty {
            // Empty response → decode from "null"
            return try decoder.decode(T.self, from: "null".data(using: .utf8)!)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    // MARK: - Bootstrap

    func bootstrap() async throws -> Catalog {
        try await request("/bootstrap", decode: Catalog.self)
    }

    // MARK: - Auth

    func me() async throws -> User? {
        do {
            return try await request("/auth/me", decode: MeResponse.self).user
        } catch let e as APIError where e.isUnauthorized {
            return nil   // 401 → signed out (matches src/api.ts:28-35)
        }
    }

    func login(email: String, password: String) async throws -> User {
        struct Body: Encodable {
            let email: String
            let password: String
        }
        return try await request("/auth/login", method: "POST", body: Body(email: email, password: password), decode: LoginResponse.self).user
    }

    func register(firstName: String, lastName: String, email: String, password: String) async throws {
        struct Body: Encodable {
            let firstName: String
            let lastName: String
            let email: String
            let password: String
        }
        // api/auth/register.js:18 returns 201 {ok:true}
        let _: OkResponse = try await request("/auth/register", method: "POST", body: Body(firstName: firstName, lastName: lastName, email: email, password: password), decode: OkResponse.self)
    }

    func logout() async throws {
        let _: OkResponse = try await request("/auth/logout", method: "POST", decode: OkResponse.self)
    }

    // MARK: - Reservations

    func reserve(slotId: String, teamId: String) async throws -> SlotConfig {
        struct Body: Encodable {
            let slotId: String
            let teamId: String
        }
        return try await request("/reservations", method: "POST", body: Body(slotId: slotId, teamId: teamId), decode: SlotResponse.self).slot
    }

    func cancel(slotId: String, teamId: String) async throws -> SlotConfig {
        struct Body: Encodable {
            let slotId: String
            let teamId: String
        }
        return try await request("/reservations", method: "DELETE", body: Body(slotId: slotId, teamId: teamId), decode: SlotResponse.self).slot
    }

    func moveReservation(slotId: String, teamId: String, newSlotId: String, newTeamId: String) async throws -> [SlotConfig] {
        struct Body: Encodable {
            let slotId: String
            let teamId: String
            let newSlotId: String
            let newTeamId: String
        }
        return try await request("/reservations", method: "PATCH", body: Body(slotId: slotId, teamId: teamId, newSlotId: newSlotId, newTeamId: newTeamId), decode: SlotsResponse.self).slots
    }

    // MARK: - Admin

    func adminList<T: Decodable>(_ entity: String) async throws -> [T] {
        try await request("/admin/\(entity)", decode: [T].self)
    }

    func adminCreate<T: Decodable>(_ entity: String, body: Encodable) async throws -> T {
        try await request("/admin/\(entity)", method: "POST", body: body, decode: T.self)
    }

    func adminUpdate<T: Decodable>(_ entity: String, body: Encodable) async throws -> T {
        try await request("/admin/\(entity)", method: "PUT", body: body, decode: T.self)
    }

    func adminDelete(_ entity: String, id: String) async throws {
        struct Body: Encodable {
            let id: String
        }
        let _: OkResponse = try await request("/admin/\(entity)", method: "DELETE", body: Body(id: id), decode: OkResponse.self)
    }

    func geocodeAddress(address: String?, name: String?, city: String?) async throws -> (lat: Double, lon: Double) {
        struct Body: Encodable {
            let address: String?
            let name: String?
            let city: String?
        }
        let geo = try await request("/admin/geocode-address", method: "POST", body: Body(address: address, name: name, city: city), decode: GeoResponse.self)
        return (lat: geo.lat, lon: geo.lon)
    }
}
