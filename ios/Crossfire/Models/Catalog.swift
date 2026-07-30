import Foundation

// MARK: - Surface

enum Surface: Codable, Hashable {
    case turf, grass, unknown

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .unknown
            return
        }
        let raw = try container.decode(String.self)
        switch raw {
        case "Turf": self = .turf
        case "Grass": self = .grass
        default: self = .unknown
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .turf: try container.encode("Turf")
        case .grass: try container.encode("Grass")
        case .unknown: try container.encodeNil()
        }
    }
}

// MARK: - Role

enum Role: String, Codable, Hashable {
    case admin
    case coach

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = Role(rawValue: raw) ?? .coach  // defensive: unknown → .coach
    }
}

// MARK: - UserStatus

enum UserStatus: String, Codable, Hashable {
    case pending
    case active

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = UserStatus(rawValue: raw) ?? .pending  // defensive: unknown → .pending
    }
}

// MARK: - Team

struct Team: Codable, Identifiable, Hashable {
    let id: String
    let gender: String
    let birthYear: Int
    let level: String
    let coachName: String?

    var label: String {
        Formatting.teamLabel(gender: gender, birthYear: birthYear, level: level)
    }
}

// MARK: - Location

struct Location: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let city: String?
    let address: String?
    let lat: Double?
    let lon: Double?
}

// MARK: - Field

struct Field: Codable, Identifiable, Hashable {
    let id: String
    let locationId: String
    let name: String
    let type: Surface
}

// MARK: - SlotConfig

struct SlotConfig: Codable, Identifiable, Hashable {
    let id: String
    let fieldId: String
    let date: String
    let startTime: String
    let endTime: String
    let maxTeams: Int
    let reservedTeamIds: [String]
}

// MARK: - User

struct User: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String
    let role: Role
    let teamIds: [String]
    let status: UserStatus?
}

// MARK: - Catalog

struct Catalog: Codable, Hashable {
    let teams: [Team]
    let locations: [Location]
    let fields: [Field]
    let slots: [SlotConfig]
}
