import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var session: Session
    @State private var selectedTab = 0
    @State private var showAuth = false
    @State private var mapFocusId: String?
    @State private var pendingMapFocus = false

    #if DEBUG
    init() {
        if let startTab = Config.env("CROSSFIRE_START_TAB"), let tab = Int(startTab) {
            _selectedTab = State(initialValue: tab)
        }
    }
    #endif

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Spacer()
                if let user = session.user {
                    Text("\(user.firstName) \(user.lastName)")
                        .font(Theme.sans(14))
                        .foregroundColor(Theme.ink)
                    Text(user.role.rawValue.lowercased())
                        .font(Theme.sans(12))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(4)
                    Button("Sign out") {
                        Task {
                            await session.logout()
                            selectedTab = 0  // reset to Schedule
                        }
                    }
                    .font(Theme.sans(14))
                    .foregroundColor(Theme.cfGreen)
                } else {
                    Button("Sign In") {
                        showAuth = true
                    }
                    .font(Theme.sans(14))
                    .foregroundColor(Theme.cfGreen)
                }
            }
            .padding()
            .background(Color.white)

            Divider()

            // Team Finder (shown on non-admin tabs when signed in)
            if selectedTab != 4 && session.user != nil {
                TeamFinderView(
                    teams: session.catalog.teams,
                    fields: session.catalog.fields,
                    locations: session.catalog.locations,
                    slots: session.catalog.slots
                )
            }

            // Tab content
            TabView(selection: $selectedTab) {
                ScheduleView(onShowMap: { id in
                    mapFocusId = id
                    pendingMapFocus = true
                    selectedTab = 3
                })
                    .tag(0)
                    .tabItem {
                        Label("Schedule", systemImage: "calendar")
                    }

                Group {
                    if session.user != nil {
                        ReserveView(onShowMap: { id in
                            mapFocusId = id
                            pendingMapFocus = true
                            selectedTab = 3
                        })
                    } else {
                        VStack(spacing: 16) {
                            Text("Sign in to reserve field slots for your team.")
                                .font(Theme.sans(16))
                                .foregroundColor(Theme.ink)
                                .multilineTextAlignment(.center)
                                .padding()
                            Button("Sign In") {
                                showAuth = true
                            }
                            .font(Theme.sans(14))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Theme.cfGreen)
                            .cornerRadius(8)
                        }
                    }
                }
                .tag(1)
                .tabItem {
                    Label("Reserve", systemImage: "plus.circle")
                }

                Group {
                    if session.user != nil {
                        MyFieldsView()
                    } else {
                        VStack(spacing: 16) {
                            Text("Sign in to view your reservations.")
                                .font(Theme.sans(16))
                                .foregroundColor(Theme.ink)
                                .multilineTextAlignment(.center)
                                .padding()
                            Button("Sign In") {
                                showAuth = true
                            }
                            .font(Theme.sans(14))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Theme.cfGreen)
                            .cornerRadius(8)
                        }
                    }
                }
                .tag(2)
                .tabItem {
                    Label("My Fields", systemImage: "list.bullet")
                }

                MapView(
                    locations: session.catalog.locations,
                    fields: session.catalog.fields,
                    focusLocationId: mapFocusId
                )
                .tag(3)
                .tabItem {
                    Label("Fields Map", systemImage: "map")
                }

                if session.isAdmin {
                    Text("Admin")
                        .font(Theme.sans(16))
                        .tag(4)
                        .tabItem {
                            Label("Admin", systemImage: "gear")
                        }
                }
            }
            .accentColor(Theme.cfGreen)
            .onChange(of: selectedTab) { oldValue, newValue in
                // Block tab switch for Reserve/My Fields when signed out
                if session.user == nil && (newValue == 1 || newValue == 2) {
                    showAuth = true
                    selectedTab = oldValue
                }

                // Clear map focus when user taps Map tab directly (not via field link)
                if newValue == 3 {
                    if pendingMapFocus {
                        // Arriving via field link; keep focus
                        pendingMapFocus = false
                    } else {
                        // Direct tap on Map tab; clear focus
                        mapFocusId = nil
                    }
                }
            }
        }
        .sheet(isPresented: $showAuth) {
            AuthSheet()
                .environmentObject(session)
        }
    }
}
