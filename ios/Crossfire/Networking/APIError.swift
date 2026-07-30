enum APIError: Error {
    case http(Int, String)   // status, server {error} message
    case decoding
    case transport
    var message: String {
        switch self {
        case .http(_, let m): return m
        case .decoding: return "Could not read the server response."
        case .transport: return "Network error. Check your connection."
        }
    }
    var isUnauthorized: Bool { if case .http(401, _) = self { return true }; return false }
}
