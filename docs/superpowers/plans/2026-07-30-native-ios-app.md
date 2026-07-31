# Native iOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native SwiftUI iOS client for Crossfire Select Field Manager, in the existing repo's `ios/` folder, at 100% feature parity with the web app, signed in against the same Vercel API and Neon database.

**Architecture:** A third surface in `crossfire-reservation` alongside `src/` (web) and `api/` (serverless). SwiftUI + MapKit only (no SPM deps). An actor `APIClient` over a cookie-carrying `URLSession` mirrors `src/api.ts` 1:1; `Codable` models mirror `api/_lib/serialize.js`; a `Session` `ObservableObject` drives a `TabView` shell. Fairness rules stay server-side — iOS renders responses/errors verbatim. Every screen's "done" is its rows in `docs/superpowers/specs/2026-07-30-ios-web-parity-audit.md` ticked and verified by build-and-drive in the simulator.

**Tech Stack:** Swift 6.3 / SwiftUI (iOS 17+), Foundation, MapKit; XcodeGen (`.xcodeproj` gitignored); Xcode 26.6; iPhone 17 simulator.

## Global Constraints

- **Reference specs (read before starting):** `docs/superpowers/specs/2026-07-30-native-ios-design.md` (design) and `docs/superpowers/specs/2026-07-30-ios-web-parity-audit.md` (the checklist — the definition of done for every screen).
- **Reference implementation to mirror:** `../afrotc-native-ios/ios/Det695/` — copy the *shape* (actor APIClient, Session phases, RootView/TabView, per-screen `@State` + `.task(id:)` + `.refreshable`, DEBUG launch env vars). Do NOT copy Keychain/bearer/refresh — crossfire uses a cookie.
- **iOS 17+ deployment target**, Swift 6.3, SwiftUI + Foundation + MapKit only. **No Swift Package dependencies.**
- **Universal app (iPhone + iPad).** `TARGETED_DEVICE_FAMILY = 1,2`, pinned explicitly in `project.yml`. Every screen's build-and-drive verification runs on BOTH an iPhone sim (**iPhone 17 Pro**) and an iPad sim (**iPad Pro 11-inch (M5)**); layouts must be usable on the wider iPad canvas (no fixed-width regressions, no clipped nav). Where the plan text says "iPhone 17", use "iPhone 17 Pro" — there is no plain "iPhone 17" simulator.
- **Bundle id:** `com.crossfireselect.fieldmanager`. **XcodeGen** is the only committed project definition; `ios/Crossfire.xcodeproj` is gitignored.
- **API base:** deployed HTTPS Vercel by default, overridable via `CROSSFIRE_API_BASE` env in the Run scheme. HTTPS everywhere → no ATS localhost exception.
- **Auth = cookie.** One `URLSession` configured with `httpCookieStorage` + `httpCookieAcceptPolicy = .always` carries `cf_session` (name from `api/_lib/auth.js`) across launches. No Keychain, no `Authorization` header, no token refresh.
- **JSON is camelCase already** (per `serialize.js`) — `JSONDecoder`/`Encoder` use **default** key strategy; **no `.convertFromSnakeCase`, no CodingKeys**. Ids are **strings**. Dates/times stay `String`.
- **Enums decode defensively:** unknown `Surface`/role/status → sensible fallback, never a decode crash.
- **Verbatim parity of error text:** decode `{error: "..."}` bodies into `APIError` and surface the server's message unchanged (fairness messages, 403 approval message).
- **Vercel must ignore `ios/`:** add `ios/` to a `.vercelignore` so web deploys are unaffected.
- **TDD adaptation (design non-goal: no XCTest target).** Where a pure-logic unit exists (formatting helpers, cascade grouping, decode round-trips), write a **lightweight assertion harness** — a `#if DEBUG` `verifySelfTests()` function that `assert()`s expected values and is invoked behind a `CROSSFIRE_SELFTEST=1` launch env var, printing `SELFTEST OK`/trapping on failure. Run it in the simulator as the "test". For UI/screen tasks with no pure logic, the test cycle is: **(a) list the exact audit rows this task must satisfy, (b) build-and-drive and confirm each row visually, (c) tick the rows.** Never mark a screen done with un-ticked rows.
- **Secrets:** public repo — never commit `DATABASE_URL`/`JWT_SECRET` or any `.env`. iOS ships no secrets (cookie is obtained at login).
- **Git identity:** commit as `drewdog88 <138076767+drewdog88@users.noreply.github.com>`. End every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Do not push without asking the user.**
- **Do not modify `src/` or `api/`.** iOS reuses the deployed API as-is.

---

## File Structure

```
crossfire-reservation/
  .vercelignore                        MODIFY/CREATE — add "ios/"
  ios/
    project.yml                        XcodeGen spec (only committed proj def)
    .gitignore                         ignores Crossfire.xcodeproj/, DerivedData/
    README.md                          build + simulator recipe
    Crossfire/
      CrossfireApp.swift               @main; injects Session; runs self-tests
      Support/
        Config.swift                   apiBaseURL (env-overridable), launch flags
        Formatting.swift               port of types.ts helpers (teamLabel, weeks, time)
        SelfTests.swift                #if DEBUG assertion harness
      Networking/
        APIClient.swift                actor; one method per src/api.ts function
        APIError.swift                 enum: .http(status,message)/.decoding/.transport
      Models/
        Catalog.swift                  Team, Location, Field, SlotConfig, User, Catalog
      State/
        Session.swift                  ObservableObject: phase, user, catalog
        WeekState.swift                ObservableObject: shared weekOffset (default 1)
      Theme/
        Theme.swift                    color tokens from src/index.css + fonts
      Pitch/
        FieldPitchView.swift           the signature vertical-columns visual
      Views/
        RootView.swift                 phase switch → splash / MainTabView
        MainTabView.swift              TabView; signed-out guard; header
        AuthSheet.swift                Sign In / Register
        TeamFinderView.swift           search across all weeks
        WeekNav.swift                  prev/next + range + This/Next/Past tags
        ScheduleView.swift             pitch cards grouped by day + location chips
        ReserveView.swift              team selector (cascade) + reserve/cancel
        TeamSelector.swift             ≤6 pills / >6 Gender→Age→Team cascade
        MyFieldsView.swift             sortable table + bulk delete + Edit sheet
        EditReservationView.swift      move team/slot
        MapView.swift                  MapKit markers + callouts + focus-on-arrival
        Admin/
          AdminView.swift              5 sub-tabs + pending badge
          AdminTeamsView.swift
          AdminLocationsView.swift
          AdminFieldsView.swift
          AdminSlotsView.swift         max-teams stepper + team overrides
          AdminUsersView.swift         approve / role / team assignment
```

Each file has one responsibility; screens are one-file-each following AFROTC.

---

## PHASE 0 — Scaffold, networking, auth shell

**Milestone:** app builds, signs in against prod, shows an empty authenticated shell; self-tests pass.

### Task 0.1: XcodeGen project + empty app that builds

**Files:**
- Create: `ios/project.yml`, `ios/.gitignore`, `ios/README.md`, `ios/Crossfire/CrossfireApp.swift`, `ios/Crossfire/Views/RootView.swift`
- Create/Modify: `.vercelignore` (repo root)

**Interfaces:**
- Produces: `CrossfireApp` (`@main`), `RootView` (placeholder `Text("Crossfire")`).

- [ ] **Step 1: Write `ios/project.yml`** (mirror `../afrotc-native-ios/ios/project.yml`):

```yaml
name: Crossfire
options:
  bundleIdPrefix: com.crossfireselect
  deploymentTarget:
    iOS: "17.0"
settings:
  base:
    DEVELOPMENT_TEAM: ""          # fill your Apple Team ID for device builds
    GENERATE_INFOPLIST_FILE: YES
    MARKETING_VERSION: "1.0"
    CURRENT_PROJECT_VERSION: "1"
targets:
  Crossfire:
    type: application
    platform: iOS
    sources: [Crossfire]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.crossfireselect.fieldmanager
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
```

- [ ] **Step 2: Write `ios/.gitignore`**

```
Crossfire.xcodeproj/
DerivedData/
*.xcuserstate
.DS_Store
```

- [ ] **Step 3: Add `ios/` to `.vercelignore`** (create the file at repo root if absent) so web deploys skip iOS.

```
ios/
```

- [ ] **Step 4: Write `ios/Crossfire/CrossfireApp.swift`**

```swift
import SwiftUI

@main
struct CrossfireApp: App {
    var body: some Scene {
        WindowGroup { RootView() }
    }
}
```

- [ ] **Step 5: Write `ios/Crossfire/Views/RootView.swift`**

```swift
import SwiftUI

struct RootView: View {
    var body: some View { Text("Crossfire") }
}
```

- [ ] **Step 6: Write `ios/README.md`** with the build recipe

````markdown
# Crossfire iOS

```bash
cd ios && xcodegen generate
xcodebuild -scheme Crossfire -destination 'platform=iOS Simulator,name=iPhone 17' build
xcrun simctl boot "iPhone 17"; open -a Simulator
# install path is printed by the build under DerivedData/.../Crossfire.app
xcrun simctl install booted <path>/Crossfire.app
xcrun simctl launch booted com.crossfireselect.fieldmanager
```
Override API base: set `CROSSFIRE_API_BASE` in the Run scheme.
````

- [ ] **Step 7: Generate + build**

Run: `cd ios && xcodegen generate && xcodebuild -scheme Crossfire -destination 'platform=iOS Simulator,name=iPhone 17' build`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 8: Commit**

```bash
git add ios .vercelignore
git commit -m "feat(ios): scaffold XcodeGen project + empty app"
```

### Task 0.2: Config + Formatting helpers + self-test harness

**Files:**
- Create: `ios/Crossfire/Support/Config.swift`, `ios/Crossfire/Support/Formatting.swift`, `ios/Crossfire/Support/SelfTests.swift`
- Modify: `ios/Crossfire/CrossfireApp.swift`

**Interfaces:**
- Produces: `Config.apiBaseURL: URL`, `Config.env(_:) -> String?`; `Formatting.teamLabel(gender:birthYear:level:) -> String`, `Formatting.formatTime(_:) -> String`, `Formatting.timeRangeLabel(start:end:) -> String`, `Formatting.weekDates(offset:) -> [Date]`, `Formatting.weekRangeLabel(_:) -> String`, `Formatting.dateToStr(_:) -> String`, `Formatting.formatDisplayDate(_:) -> String`; `runSelfTests()`.

- [ ] **Step 1: Write the failing self-tests** (`SelfTests.swift`) — mirror expected outputs from `src/types.ts`:

```swift
import Foundation

func runSelfTests() {
    // teamLabel: B/G + 2-digit year + level  (types.ts:56-59)
    assert(Formatting.teamLabel(gender: "Boys", birthYear: 2014, level: "D") == "B14-D")
    assert(Formatting.teamLabel(gender: "Girls", birthYear: 2009, level: "A") == "G09-A")
    // formatTime: 24h -> "h[:mm] am/pm"  (types.ts:62-68)
    assert(Formatting.formatTime("17:30") == "5:30 pm")
    assert(Formatting.formatTime("18:00") == "6 pm")
    assert(Formatting.formatTime("00:00") == "12 am")
    assert(Formatting.timeRangeLabel(start: "16:30", end: "18:00") == "4:30 pm – 6:00 pm")
    // weekDates: 7 days, Monday-anchored  (types.ts:82-93)
    let wk = Formatting.weekDates(offset: 0)
    assert(wk.count == 7)
    let cal = Calendar(identifier: .gregorian)
    assert(cal.component(.weekday, from: wk[0]) == 2) // Monday
    print("SELFTEST OK")
}
```

- [ ] **Step 2: Write `Config.swift`**

```swift
import Foundation

enum Config {
    static func env(_ key: String) -> String? {
        let v = ProcessInfo.processInfo.environment[key]
        return (v?.isEmpty == false) ? v : nil
    }
    static var apiBaseURL: URL {
        if let override = env("CROSSFIRE_API_BASE"), let u = URL(string: override) { return u }
        return URL(string: "https://crossfire-reservation.vercel.app")!  // TODO: confirm prod host
    }
}
```

(Confirm the deployed host with the user or `vercel.json`/dashboard before first sign-in test.)

- [ ] **Step 3: Write `Formatting.swift`** porting `types.ts` 1:1

```swift
import Foundation

enum Formatting {
    static func teamLabel(gender: String, birthYear: Int, level: String) -> String {
        let yy = String(format: "%02d", birthYear % 100)
        return "\(gender == "Boys" ? "B" : "G")\(yy)-\(level)"
    }

    static func formatTime(_ hhmm: String) -> String {
        let parts = hhmm.split(separator: ":").map { Int($0) }
        guard let h = parts.first ?? nil else { return hhmm }
        let m = parts.count > 1 ? (parts[1] ?? 0) : 0
        let period = h >= 12 ? "pm" : "am"
        let hour12 = h % 12 == 0 ? 12 : h % 12
        return m == 0 ? "\(hour12) \(period)" : "\(hour12):\(String(format: "%02d", m)) \(period)"
    }

    static func timeRangeLabel(start: String, end: String) -> String {
        "\(formatTime(start)) – \(formatTime(end))"
    }

    private static var cal: Calendar {
        var c = Calendar(identifier: .gregorian); c.firstWeekday = 2; return c
    }

    static func weekDates(offset: Int) -> [Date] {
        let today = Date()
        let dow = cal.component(.weekday, from: today) // 1=Sun..7=Sat
        let deltaToMonday = (dow == 1 ? -6 : 2 - dow)
        let monday = cal.startOfDay(for: cal.date(byAdding: .day, value: deltaToMonday + offset * 7, to: today)!)
        return (0..<7).map { cal.date(byAdding: .day, value: $0, to: monday)! }
    }

    static func dateToStr(_ d: Date) -> String {
        let f = DateFormatter(); f.calendar = cal; f.dateFormat = "yyyy-MM-dd"; return f.string(from: d)
    }

    static func weekRangeLabel(_ dates: [Date]) -> String {
        let f = DateFormatter(); f.dateFormat = "MMM d"
        return "\(f.string(from: dates[0])) – \(f.string(from: dates[6]))"
    }

    static func formatDisplayDate(_ dateStr: String) -> String {
        let inF = DateFormatter(); inF.calendar = cal; inF.dateFormat = "yyyy-MM-dd"
        guard let d = inF.date(from: dateStr) else { return dateStr }
        let outF = DateFormatter(); outF.dateFormat = "EEE, MMM d"
        return outF.string(from: d)
    }
}
```

- [ ] **Step 4: Invoke self-tests from `@main`** behind the launch flag

```swift
init() { if Config.env("CROSSFIRE_SELFTEST") == "1" { runSelfTests() } }
```

- [ ] **Step 5: Build, then run with the self-test flag**

Run:
```bash
cd ios && xcodegen generate && xcodebuild -scheme Crossfire -destination 'platform=iOS Simulator,name=iPhone 17' build
xcrun simctl boot "iPhone 17" 2>/dev/null; \
APP=$(find ~/Library/Developer/Xcode/DerivedData -name Crossfire.app -path '*Debug-iphonesimulator*' | head -1); \
xcrun simctl install booted "$APP"; \
xcrun simctl launch --console-pty --terminate-running-process booted com.crossfireselect.fieldmanager 2>&1 | grep -m1 SELFTEST
```
(Set the env var for launch via `SIMCTL_CHILD_CROSSFIRE_SELFTEST=1` before `simctl launch`.)
Expected: `SELFTEST OK` (no assertion trap)

- [ ] **Step 6: Commit**

```bash
git add ios/Crossfire/Support
git commit -m "feat(ios): Config + Formatting (types.ts port) + self-test harness"
```

### Task 0.3: Codable models mirroring serialize.js

**Files:**
- Create: `ios/Crossfire/Models/Catalog.swift`
- Modify: `ios/Crossfire/Support/SelfTests.swift`

**Interfaces:**
- Produces: `struct Team {id:String; gender:String; birthYear:Int; level:String; coachName:String?}` (+ `var label: String`), `struct Location {id,name:String; city:String?; address:String?; lat:Double?; lon:Double?}`, `struct Field {id,locationId,name:String; type:Surface}`, `enum Surface {turf,grass,unknown}` (decodes "Turf"/"Grass"/null), `struct SlotConfig {id,fieldId,date,startTime,endTime:String; maxTeams:Int; reservedTeamIds:[String]}`, `enum Role {admin,coach}`, `enum UserStatus {pending,active}`, `struct User {id,firstName,lastName,email:String; role:Role; teamIds:[String]; status:UserStatus?}`, `struct Catalog {teams:[Team]; locations:[Location]; fields:[Field]; slots:[SlotConfig]}`. All `Codable, Identifiable, Hashable`.

- [ ] **Step 1: Add a decode round-trip self-test**

```swift
func runModelSelfTests() {
    let json = """
    {"teams":[{"id":"1","gender":"Boys","birthYear":2014,"level":"D","coachName":null}],
     "locations":[{"id":"2","name":"Grasslawn","city":"Redmond","address":null,"lat":47.6,"lon":-122.1}],
     "fields":[{"id":"3","locationId":"2","name":"Park 1","type":null}],
     "slots":[{"id":"4","fieldId":"3","date":"2026-08-01","startTime":"17:30","endTime":"19:00","maxTeams":4,"reservedTeamIds":["1"]}]}
    """.data(using: .utf8)!
    let c = try! JSONDecoder().decode(Catalog.self, from: json)
    assert(c.teams[0].label == "B14-D")
    assert(c.teams[0].coachName == nil)
    assert(c.fields[0].type == .unknown)       // null -> .unknown, no crash
    assert(c.slots[0].reservedTeamIds == ["1"])
    print("MODEL SELFTEST OK")
}
```

- [ ] **Step 2: Write `Catalog.swift`** with the structs above. `Surface` decodes defensively:

```swift
enum Surface: Codable, Hashable {
    case turf, grass, unknown
    init(from d: Decoder) throws {
        let c = try d.singleValueContainer()
        if c.decodeNil() { self = .unknown; return }
        switch try c.decode(String.self) {
        case "Turf": self = .turf
        case "Grass": self = .grass
        default: self = .unknown
        }
    }
    func encode(to e: Encoder) throws {
        var c = e.singleValueContainer()
        switch self { case .turf: try c.encode("Turf"); case .grass: try c.encode("Grass"); case .unknown: try c.encodeNil() }
    }
}
```

`Team.label` calls `Formatting.teamLabel(gender:birthYear:level:)`. `Role`/`UserStatus` decode defensively (unknown role → `.coach`).

- [ ] **Step 3: Wire `runModelSelfTests()` into the `CROSSFIRE_SELFTEST` path.**

- [ ] **Step 4: Build + run self-tests**

Run: same recipe as Task 0.2 Step 5, grep for `MODEL SELFTEST OK`.
Expected: `MODEL SELFTEST OK`

- [ ] **Step 5: Commit**

```bash
git add ios/Crossfire/Models ios/Crossfire/Support/SelfTests.swift
git commit -m "feat(ios): Codable models mirroring serialize.js + decode self-test"
```

### Task 0.4: APIClient actor + APIError

**Files:**
- Create: `ios/Crossfire/Networking/APIClient.swift`, `ios/Crossfire/Networking/APIError.swift`

**Interfaces:**
- Consumes: `Config.apiBaseURL`, models from Task 0.3.
- Produces: `actor APIClient` with `shared` singleton and, mirroring `src/api.ts`:
  `bootstrap() async throws -> Catalog`, `me() async throws -> User?`, `login(email:password:) async throws -> User`, `register(firstName:lastName:email:password:) async throws`, `logout() async throws`, `reserve(slotId:teamId:) async throws -> SlotConfig`, `cancel(slotId:teamId:) async throws -> SlotConfig`, `moveReservation(slotId:teamId:newSlotId:newTeamId:) async throws -> [SlotConfig]`, `adminList<T:Decodable>(_ entity:String) async throws -> [T]`, `adminCreate<T:Decodable>(_ entity:String, body:Encodable) async throws -> T`, `adminUpdate<T:Decodable>(_ entity:String, body:Encodable) async throws -> T`, `adminDelete(_ entity:String, id:String) async throws`, `geocodeAddress(address:name:city:) async throws -> (lat:Double, lon:Double)`.
- `enum APIError: Error { case http(Int, String), decoding, transport, unauthorized }` with `var message: String`.

- [ ] **Step 1: Write `APIError.swift`**

```swift
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
```

- [ ] **Step 2: Write `APIClient.swift`** — one cookie-carrying `URLSession`, a private `request` core mirroring `src/api.ts` `req` (throws server `{error}` on non-2xx):

```swift
import Foundation

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

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil, decode: T.Type) async throws -> T {
        var r = URLRequest(url: Config.apiBaseURL.appendingPathComponent("api" + path))
        r.httpMethod = method
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body { r.httpBody = try encoder.encode(AnyEncodable(body)) }
        let (data, resp): (Data, URLResponse)
        do { (data, resp) = try await session.data(for: r) } catch { throw APIError.transport }
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if !(200...299).contains(status) {
            let msg = (try? decoder.decode([String: String].self, from: data))?["error"] ?? "Request failed (\(status))"
            throw APIError.http(status, msg)
        }
        if data.isEmpty { return try decoder.decode(T.self, from: "null".data(using: .utf8)!) }
        do { return try decoder.decode(T.self, from: data) } catch { throw APIError.decoding }
    }
    // ... typed methods below wrap `request`, e.g.:
    func bootstrap() async throws -> Catalog { try await request("/bootstrap", decode: Catalog.self) }
    func me() async throws -> User? {
        do { return try await request("/auth/me", decode: MeResponse.self).user }
        catch let e as APIError where e.isUnauthorized { return nil }   // 401 -> signed out (matches src/api.ts:28-35)
    }
    // login/register/logout/reserve/cancel/moveReservation/admin*/geocode analogous to src/api.ts
}
```

Add `struct AnyEncodable: Encodable` wrapper, and small response structs (`MeResponse{user:User}`, `LoginResponse{user:User}`, `SlotResponse{slot:SlotConfig}`, `SlotsResponse{slots:[SlotConfig]}`, `GeoResponse{lat,lon:Double}`). Match each method's shape to `src/api.ts` exactly (move → `{slots}`; reserve/cancel → `{slot}`; register/logout return no body; adminDelete → `{ok}`).

- [ ] **Step 3: Build**

Run: `cd ios && xcodegen generate && xcodebuild -scheme Crossfire -destination 'platform=iOS Simulator,name=iPhone 17' build`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add ios/Crossfire/Networking
git commit -m "feat(ios): APIClient actor + APIError mirroring src/api.ts"
```

### Task 0.5: Session + WeekState + Theme

**Files:**
- Create: `ios/Crossfire/State/Session.swift`, `ios/Crossfire/State/WeekState.swift`, `ios/Crossfire/Theme/Theme.swift`
- Modify: `ios/Crossfire/CrossfireApp.swift`

**Interfaces:**
- Produces: `@MainActor final class Session: ObservableObject { enum Phase {loading, ready}; @Published phase; @Published user:User?; @Published catalog:Catalog; func bootstrap() async; func login(...) async throws; func register(...) async throws; func logout() async; var isAdmin: Bool }`. `@MainActor final class WeekState: ObservableObject { @Published offset:Int = 1 }`. `Theme` with `cfGreen`, `cfGreenLight`, `navy` ramp, display/sans fonts.

- [ ] **Step 1: Write `Theme.swift`** — tokens from `src/index.css`/`docs/field-graphic-mockups.html`:

```swift
import SwiftUI
enum Theme {
    static let cfGreen = Color(red: 0x15/255, green: 0x80/255, blue: 0x3d/255)      // #15803d
    static let cfGreenLight = Color(red: 0xbb/255, green: 0xf7/255, blue: 0xd0/255) // #bbf7d0
    static let pageBg = Color(red: 0xee/255, green: 0xf1/255, blue: 0xf6/255)       // #eef1f6
    static let ink = Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255)         // #1e293b
    static func display(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy) } // Barlow Condensed stand-in until font bundled
    static func sans(_ size: CGFloat) -> Font { .system(size: size) }
}
```

(Note: bundling Barlow Condensed/Outfit `.ttf` is optional polish — record as an audit "accepted difference" if system fonts are used.)

- [ ] **Step 2: Write `WeekState.swift`** (`@Published var offset = 1`).

- [ ] **Step 3: Write `Session.swift`** — parallel `bootstrap()`+`me()` on launch (mirrors `App.tsx` bootstrap):

```swift
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
```

- [ ] **Step 4: Inject into `@main`**

```swift
@StateObject private var session = Session()
@StateObject private var week = WeekState()
// WindowGroup { RootView().environmentObject(session).environmentObject(week).task { await session.bootstrap() } }
```

- [ ] **Step 5: Build.** Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 6: Commit**

```bash
git add ios/Crossfire/State ios/Crossfire/Theme ios/Crossfire/CrossfireApp.swift
git commit -m "feat(ios): Session + WeekState + Theme"
```

### Task 0.6: RootView splash + MainTabView shell + AuthSheet

**Files:**
- Create: `ios/Crossfire/Views/MainTabView.swift`, `ios/Crossfire/Views/AuthSheet.swift`
- Modify: `ios/Crossfire/Views/RootView.swift`

**Audit rows satisfied:** App shell (splash, header, tab order, signed-out guard + placeholders, sign out) and Auth sheet (toggle, fields, helper text, success notice, error banner, verbatim 403).

**Interfaces:**
- Consumes: `Session`, `WeekState`.
- Produces: `MainTabView` (owns `@State selectedTab`, `@State showAuth`), `AuthSheet(mode:)`.

- [ ] **Step 1: `RootView`** switches on phase:

```swift
struct RootView: View {
    @EnvironmentObject var session: Session
    var body: some View {
        switch session.phase {
        case .loading: VStack { ProgressView(); Text("Loading…") }
        case .ready: MainTabView()
        }
    }
}
```

- [ ] **Step 2: `MainTabView`** — tabs Schedule/Reserve/My Fields/Fields Map (+ Admin when `session.isAdmin`), header with name+role + Sign out, DEBUG launch affordances (`CROSSFIRE_START_TAB`). Reserve/My Fields tapped while signed out → set `showAuth = true` instead of switching (mirror `App.tsx:3539-3545`). Signed-out placeholders use the exact strings from the audit.

- [ ] **Step 3: `AuthSheet`** — segmented Sign In/Register; fields, buttons ("Sign In"/"Signing in…", "Create Account"/"Creating…"); on register success switch to login + green notice "Account created. An admin must approve it before you can sign in."; surface `APIError.message` verbatim in the red banner (this is how the 403 "Your account is awaiting admin approval." appears). Register helper text exact.

- [ ] **Step 4: Confirm prod host** in `Config.apiBaseURL` with the user, then **build-and-drive**: launch, sign in with a real coach account, confirm shell renders and tabs match; sign out; open auth as register, submit, confirm notice.

Run the build+install+launch recipe (Task 0.2 Step 5, no self-test flag).
Expected: sign-in succeeds against prod; header + tabs render; register shows the approval notice.

- [ ] **Step 5: Tick the App-shell and Auth-sheet audit rows** in `2026-07-30-ios-web-parity-audit.md` that are now verified.

- [ ] **Step 6: Commit**

```bash
git add ios docs/superpowers/specs/2026-07-30-ios-web-parity-audit.md
git commit -m "feat(ios): shell (splash, tabs, header, sign out) + auth sheet"
```

---

## PHASE 1 — Coach-facing screens

**Milestone:** a coach can do everything they can on web. Every Phase-1 audit row ticked.

### Task 1.1: WeekNav + the FieldPitchView visual

**Files:**
- Create: `ios/Crossfire/Views/WeekNav.swift`, `ios/Crossfire/Pitch/FieldPitchView.swift`

**Audit rows:** Field pitch card (all rows) + WeekNav (This/Next/Past tags, no min/max).

**Interfaces:**
- Consumes: `SlotConfig`, `Field`, `Team`, `Session.catalog`, `WeekState`.
- Produces: `WeekNav()` (binds `WeekState.offset`), `FieldPitchView(slot:field:location:teamsById:mode:myTeamId:dayBooked:onReserve:onCancel:)` where `enum PitchMode { case view, reserve }`.

- [ ] **Step 1: `WeekNav`** — prev/next chevrons, `Formatting.weekRangeLabel`, tag = "This Week" (offset 0) / "Next Week" (1) / "Past" (<0) / else range only; no bounds.

- [ ] **Step 2: `FieldPitchView`** — faithful rebuild of `docs/field-graphic-mockups.html` + `FieldPitchCard` (`App.tsx:611-831`): header (field name, surface badge Turf-blue/Grass-green/Unknown-gray, cf-green time, open-count badge "FULL"/"1 OPEN"/"{n} OPEN" + "{filled}/{maxTeams} spots"); `ZStack` striped background (turf vs grass gradient), `Canvas` markings (halfway line, center circle, penalty arcs at opacity .06–.065), `HStack` of team columns then open lanes, dashed dividers, "YOURS" badge + green gradient for own team, rotated labels when `>3` sections, reserve mode empty column = dashed "＋ Reserve" (tappable) / non-interactive = "Available"; height 150/168/184 by maxTeams; footer per mode (reserve: "{team} · reserved" + Cancel / amber already-booked / red all-taken / hint; view: none). `canAct = mode == .reserve && myTeamId != nil && !dayBooked && open > 0`.

- [ ] **Step 3: Build.** Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit** (visual verified in Schedule task):

```bash
git add ios/Crossfire/Views/WeekNav.swift ios/Crossfire/Pitch
git commit -m "feat(ios): WeekNav + FieldPitchView (signature visual)"
```

### Task 1.2: ScheduleView (public)

**Files:** Create `ios/Crossfire/Views/ScheduleView.swift`; wire into `MainTabView`.
**Audit rows:** Schedule (WeekNav, location chips, cards grouped by day, empty state, map link).

- [ ] **Step 1:** Build `ScheduleView` — WeekNav; location filter chips ("All fields" default + one per location); slots for the current week (via `Formatting.weekDates(offset:)` → date strings) whose field exists, grouped by date with a day header, each rendered as `FieldPitchView(mode: .view)`; empty state exact string; location line links to Fields Map when the location has lat+lon.
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** — Schedule tab shows this week's fields, chips filter, empty week shows the copy, pitch visual matches web. Tick Schedule + FieldPitchView + WeekNav audit rows.
- [ ] **Step 4: Commit** `feat(ios): Schedule view`.

### Task 1.3: TeamSelector (cascade)

**Files:** Create `ios/Crossfire/Views/TeamSelector.swift`; modify `SelfTests.swift`.
**Audit rows:** Reserve team-selector cascade rows.

**Interfaces:** Produces `TeamSelector(teams:[Team], selectedTeamId: Binding<String?>, isAdmin: Bool)`; helper `cascadeGroups(_ teams:[Team]) -> ...` and `disambiguatedLabel(_ team:Team, in:[Team]) -> String` (append coach name on label collision — mirror `src/App.tsx` `disambiguatedLabel`).

- [ ] **Step 1: Self-test** for the pure logic: `disambiguatedLabel` appends coach when two teams share a label; `useCascade` gate is `teams.count > 6`; gender row hidden when one gender. Add asserts to `runSelfTests()`.
- [ ] **Step 2:** Implement `TeamSelector` — ≤6 → wrapping pill row; >6 → Gender→Age→Team chip rows (gender hidden when single; age asc; team by label; changing gender/age keeps valid pick else first-in-group). Label "Reserving for (admin — any team)" vs "Reserving for".
- [ ] **Step 3: Run self-tests** → `SELFTEST OK`.
- [ ] **Step 4: Commit** `feat(ios): Reserve team selector (cascade) + self-tests`.

### Task 1.4: ReserveView

**Files:** Create `ios/Crossfire/Views/ReserveView.swift`; wire into `MainTabView`.
**Audit rows:** Reserve (all), incl. selector hidden for single-team coaches, toasts, empty states.

- [ ] **Step 1:** Build `ReserveView` — WeekNav; `reservableTeams` = admin? all : coach's `teamIds`; hide selector when `count <= 1`; `TeamSelector` otherwise; location chips; `FieldPitchView(mode: .reserve, myTeamId: selectedTeamId)`; reserve/cancel call `APIClient` then `session.refreshCatalog()`; success → toast overlay "Spot reserved! 🎉" / "Reservation cancelled." (auto-dismiss 3s); `APIError.message` → red toast (fairness text verbatim); no-teams empty state; slots empty state (distinct copy).
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** — reserve a real slot as a coach, see toast + column fills; cancel; trigger a fairness error (book a 3rd this week) and confirm the exact server message in the toast. Tick Reserve rows + the fairness-message rows exercised.
- [ ] **Step 4: Commit** `feat(ios): Reserve view + toasts + fairness passthrough`.

### Task 1.5: MyFieldsView + EditReservationView

**Files:** Create `ios/Crossfire/Views/MyFieldsView.swift`, `ios/Crossfire/Views/EditReservationView.swift`; wire in.
**Audit rows:** My Fields (flat sortable table only), bulk delete, Edit/Move sheet.

- [ ] **Step 1:** Build `MyFieldsView` — **flat sortable table only, no pitch visual**; WeekNav; title "My Reservations"/"All Reservations"; columns [checkbox], Day, Time, Field(+surface tag), Location, Team, Actions; sortable headers (default Day asc, ▲/▼ indicator, click active flips); select-all + per-row checkboxes (selected rows tinted); bulk "Delete selected ({N})" with `.confirmationDialog` "Cancel {N} reservation(s)?" and partial-failure alert; per-row Edit → sheet, Cancel with confirm "Cancel this reservation?"; empty state exact.
- [ ] **Step 2:** Build `EditReservationView` — team picker + slot picker (Day·Time·Field·Location with "(current)"/"(full)"/"· {n} open" suffix); Save disabled if unchanged; calls `moveReservation`, applies returned `{slots}` via `refreshCatalog()`.
- [ ] **Step 3: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 4: Build-and-drive** — list shows the coach's reservations, sort flips, bulk delete confirms, Edit moves a reservation. Tick My Fields rows.
- [ ] **Step 5: Commit** `feat(ios): My Fields table + Edit/Move + bulk delete`.

### Task 1.6: MapView + TeamFinderView

**Files:** Create `ios/Crossfire/Views/MapView.swift`, `ios/Crossfire/Views/TeamFinderView.swift`; wire in.
**Audit rows:** Fields Map (markers, callouts, focus-on-arrival, empty state, unmapped panel) + Team Finder (all).

- [ ] **Step 1:** Build `MapView` with MapKit `Map` — marker per located field, default region Redmond [47.67, -122.12], callout name/city/"{n} field(s)", focus-on-arrival (center + zoom 14 + open popup once) from a Schedule link, total-empty state, "Not mapped yet" panel. Log Apple-Maps-vs-OSM as accepted difference.
- [ ] **Step 2:** Build `TeamFinderView` (shown on non-admin tabs) — placeholder text, clear button, results only at ≥2 chars, ANDed words, matches label/coach/gender/4-digit + 2-digit year, searches all weeks, sorted date DESC then start DESC, "{N} practice(s)" footer, empty state with curly quotes, row layout.
- [ ] **Step 3: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 4: Build-and-drive** — map shows markers + callouts; tapping a Schedule location focuses the map; team search returns ranked results. Tick Map + Team Finder rows.
- [ ] **Step 5: Commit** `feat(ios): Fields Map + Team Finder`.

---

## PHASE 2 — Admin console

**Milestone:** full parity; audit 100% ticked.

### Task 2.1: AdminView shell

**Files:** Create `ios/Crossfire/Views/Admin/AdminView.swift`; add Admin tab in `MainTabView` (admin only).
**Audit rows:** Admin shell (5 sub-tabs, pending badge, no success toasts, full refresh, errors → alert).

- [ ] **Step 1:** Build `AdminView` — 5 sticky sub-tabs (Teams/Locations/Fields/Slots/Users, default Teams); amber pending-count badge on Users; a shared `refreshAdmin()` that re-pulls bootstrap + `adminList("users")`; a shared `reportError(_:)` → `.alert` showing `APIError.message`. No success toasts anywhere.
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Commit** `feat(ios): Admin shell + sub-tabs + pending badge`.

### Task 2.2: Admin Teams

**Files:** Create `ios/Crossfire/Views/Admin/AdminTeamsView.swift`.
**Audit rows:** Admin — Teams (inline add/edit form, fields+validation, delete confirm, sorted list).

- [ ] **Step 1:** Inline add/edit form (Gender select; Birth Year 2005–2020 required; Level free text required; Coach optional→null); "Add Team"/"Update"; Cancel only in edit; delete confirm "Delete this team? Its reservations will be removed."; list sorted by label; each mutation → `adminCreate/Update/Delete` then `refreshAdmin()`.
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** as admin — add/edit/delete a team; confirm list refresh + confirm dialog. Tick rows.
- [ ] **Step 4: Commit** `feat(ios): Admin Teams`.

### Task 2.3: Admin Locations (+ geocode)

**Files:** Create `ios/Crossfire/Views/Admin/AdminLocationsView.swift`.
**Audit rows:** Admin — Locations (fields, lat/lon validation strings, Resolve Location, inline geo error, delete confirm).

- [ ] **Step 1:** Form (Name required; City/Address opt→null; Lat/Lon); lat validate finite ∈[-90,90] else alert "Latitude must be a number between -90 and 90.", lon ∈[-180,180]; "Resolve Location" (enabled when address, or name+city) → `geocodeAddress`, fill lat/lon, label "Resolving…"; geocode failure → **inline red text** "Could not resolve. Enter coordinates manually."; delete confirm "Delete this location? Its fields and slots will be removed."; row sub-line city + "· 📍 mapped".
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** — add a location, Resolve an address, delete. Tick rows.
- [ ] **Step 4: Commit** `feat(ios): Admin Locations + geocode`.

### Task 2.4: Admin Fields

**Files:** Create `ios/Crossfire/Views/Admin/AdminFieldsView.swift`.
**Audit rows:** Admin — Fields.

- [ ] **Step 1:** Form (Location select defaults first; Field Name required; Surface select Unknown(null)/Turf/Grass); delete confirm "Delete this field? Its slots will be removed."; row = name + location + colored surface chip.
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** — add/delete a field. Tick rows.
- [ ] **Step 4: Commit** `feat(ios): Admin Fields`.

### Task 2.5: Admin Slots (stepper + overrides)

**Files:** Create `ios/Crossfire/Views/Admin/AdminSlotsView.swift`.
**Audit rows:** Admin — Slots (week-scoped, add form + validations, no edit form, delete confirm, max-teams stepper clamps, occupancy bar, override chips no-confirm, add-override, empty state).

- [ ] **Step 1:** WeekNav (shared); add form (Field select "{location} — {field}"; Date required; Max Teams 1–8; Start 17:30/End 19:00 defaults); validations end>start ("End time must be after start time.") + duplicate ("A slot for this field, date, and start time already exists."); add resets only Date; per-slot card (header, date·time, Trash, delete confirm "Delete this slot? Its reservations will be removed."); **max-teams stepper** −/+ clamps floor=max(1,reserved) ceiling=8 in-handler then `adminUpdate`; OccupancyBar (green/amber/red) + "{reserved}/{max}"; reserved-team override chips (X remove → `cancel`, **no confirm**); add-override row (select + Add → `reserve`); empty state "No slots configured for this week. Add slots above.".
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** — add a slot, bump max-teams, add + remove a team override. Tick rows.
- [ ] **Step 4: Commit** `feat(ios): Admin Slots + stepper + overrides`.

### Task 2.6: Admin Users

**Files:** Create `ios/Crossfire/Views/Admin/AdminUsersView.swift`.
**Audit rows:** Admin — Users (pending/active split, badges, approve, role persists on change, team pills + Save/Done, delete confirm, empty state).

- [ ] **Step 1:** "Pending Approval" (only if any) + "Users" sections; user card (name, email, amber "pending"/role chip/green team chips); pending → **Approve** → `adminUpdate("users", {id, status:"active"})`; active → Edit expander; Role select persists immediately on change (`adminUpdate`); team pills staged in `draftTeamIds`, "Save Teams" persists, "Done" discards; delete confirm "Delete this user?"; active-empty "No active users yet.".
- [ ] **Step 2: Build.** Expected: `** BUILD SUCCEEDED **`.
- [ ] **Step 3: Build-and-drive** — approve a pending user, change a role, assign+save teams. Tick rows.
- [ ] **Step 4: Commit** `feat(ios): Admin Users + approve/role/team assignment`.

### Task 2.7: Final parity sweep

**Files:** Modify `docs/superpowers/specs/2026-07-30-ios-web-parity-audit.md`.

- [ ] **Step 1:** Walk every audit row; for any not yet ticked, build-and-drive that path and either tick it or file the gap as a follow-up task.
- [ ] **Step 2:** Confirm every fairness-rule row was exercised at least once (some only reachable via admin overrides / concurrent booking).
- [ ] **Step 3:** Run the full self-test suite (`CROSSFIRE_SELFTEST=1`) → all `OK`.
- [ ] **Step 4: Commit** `docs(ios): parity audit 100% ticked — full web/iOS parity`.

---

## Self-Review

**1. Spec coverage.** Every §2/§3/§4/§4a/§5/§6/§7 element of the design maps to a task: networking+models (0.3–0.4), cookie session (0.4–0.5), TabView/nav/guards (0.6), pitch visual (1.1), cascade selector (1.3), map + geocode (1.6, 2.3), fairness passthrough (1.4 + 2.7), parity mechanism (audit ticked per screen + 2.7), build/emulation (0.1 + every build-and-drive step). Every Tier-1 screen and Tier-2 sub-feature in the audit has an owning task.

**2. Placeholder scan.** No "TBD/handle edge cases/similar to Task N". The one deliberate unknown — the prod Vercel host in `Config.apiBaseURL` — is flagged with an explicit confirm step (0.2 Step 2, 0.6 Step 4), not left silent. Font bundling is called out as optional/accepted-difference, not a hidden gap.

**3. Type consistency.** `Catalog`/`Team`/`SlotConfig`/`User`/`Surface` names are used identically across 0.3 → all consumers. `APIClient` method names match `src/api.ts` verbatim (0.4) and are called unchanged in 1.4/1.5/2.x. `Session.refreshCatalog()` / `WeekState.offset` / `PitchMode` are defined once and referenced consistently. Move returns `[SlotConfig]`, reserve/cancel return `SlotConfig` — matches `src/api.ts`.

**Adaptation note:** classic red-green unit TDD is replaced by (a) self-test asserts for pure logic and (b) audit-row build-and-drive for UI, per the design's explicit "no XCTest target" non-goal. This is the honest, matching-the-codebase test strategy, not a skipped step.
