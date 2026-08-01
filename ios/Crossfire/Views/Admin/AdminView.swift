import SwiftUI

enum AdminTab {
    case teams, locations, fields, slots, users
}

struct AdminView: View {
    @EnvironmentObject var session: Session
    @EnvironmentObject var weekState: WeekState

    @State private var selectedTab: AdminTab = .teams
    @State private var users: [User] = []
    @State private var errorMessage: String?

    var body: some View {
        let pending = users.filter { ($0.status ?? .pending) == .pending }.count

        VStack(spacing: 0) {
            // Sticky sub-tab bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    tabButton(tab: .teams, label: "Teams", badgeCount: nil)
                    tabButton(tab: .locations, label: "Locations", badgeCount: nil)
                    tabButton(tab: .fields, label: "Fields", badgeCount: nil)
                    tabButton(tab: .slots, label: "Slots", badgeCount: nil)
                    tabButton(tab: .users, label: "Users", badgeCount: pending > 0 ? pending : nil)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
            }
            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255)),
                alignment: .bottom
            )

            // Tab content
            ScrollView {
                VStack(spacing: 16) {
                    switch selectedTab {
                    case .teams:
                        AdminTeamsView(teams: session.catalog.teams, refresh: { await refreshAdmin() })
                    case .locations:
                        Text("Locations")
                            .font(Theme.sans(16))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                    case .fields:
                        Text("Fields")
                            .font(Theme.sans(16))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                    case .slots:
                        Text("Slots")
                            .font(Theme.sans(16))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                    case .users:
                        Text("Users")
                            .font(Theme.sans(16))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                    }
                }
                .padding(16)
            }
            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
        }
        .task {
            await refreshAdmin()
        }
        .alert(isPresented: .constant(errorMessage != nil)) {
            Alert(
                title: Text("Error"),
                message: Text(errorMessage ?? ""),
                dismissButton: .default(Text("OK")) {
                    errorMessage = nil
                }
            )
        }
    }

    // MARK: - Tab Button

    private func tabButton(tab: AdminTab, label: String, badgeCount: Int?) -> some View {
        Button {
            selectedTab = tab
        } label: {
            HStack(spacing: 6) {
                Text(label)
                    .font(Theme.display(14))
                    .tracking(0.5)

                if let count = badgeCount {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 0xf5/255, green: 0x9e/255, blue: 0x0b/255))
                        .cornerRadius(9)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .background(
                selectedTab == tab
                    ? Theme.cfGreen
                    : Color.clear
            )
            .foregroundColor(
                selectedTab == tab
                    ? Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255)
                    : Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255)
            )
            .cornerRadius(8)
        }
    }

    // MARK: - Shared Functions

    private func refreshAdmin() async {
        await session.refreshCatalog()
        users = (try? await APIClient.shared.adminList("users")) ?? users
    }

    private func reportError(_ error: Error) {
        errorMessage = (error as? APIError)?.message ?? "Something went wrong."
    }
}
