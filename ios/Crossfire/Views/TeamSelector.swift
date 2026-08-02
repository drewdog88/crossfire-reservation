import SwiftUI

// MARK: - Pure helpers (testable from SelfTests)

enum TeamSelectorHelpers {
    /// Appends " · coachName" when two teams in the group share a label AND coachName is non-nil.
    /// Returns plain label otherwise (incl. when coachName nil even on collision).
    static func disambiguatedLabel(_ team: Team, in teams: [Team]) -> String {
        let label = team.label
        let collides = teams.contains { $0.id != team.id && $0.label == label }
        return collides && team.coachName != nil ? "\(label) · \(team.coachName!)" : label
    }

    /// Cascade gate: >6 teams → true (use cascade rows), ≤6 → false (single wrapping pill row).
    /// Retained for SelfTests; the live selector now uses a grouped dropdown for all counts.
    static func useCascade(_ count: Int) -> Bool {
        count > 6
    }

    /// Genders present in stable Boys→Girls order, filtered to those represented.
    static func gendersPresent(in teams: [Team]) -> [String] {
        let genders = ["Boys", "Girls"]
        return genders.filter { g in teams.contains { $0.gender == g } }
    }

    /// Unique birth years for a given gender, sorted ascending.
    static func birthYears(for gender: String, in teams: [Team]) -> [Int] {
        Array(Set(teams.filter { $0.gender == gender }.map { $0.birthYear })).sorted()
    }

    /// Teams for a given gender and year, sorted by label.
    static func teamsForYear(_ gender: String, _ year: Int, in teams: [Team]) -> [Team] {
        teams
            .filter { $0.gender == gender && $0.birthYear == year }
            .sorted { $0.label.localizedCompare($1.label) == .orderedAscending }
    }
}

// MARK: - TeamSelector

struct TeamSelector: View {
    let teams: [Team]
    @Binding var selectedTeamId: String?
    let isAdmin: Bool

    // Slate palette (matches the rest of the light theme)
    private let slate = Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255)
    private let surface = Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255)
    private let border = Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255)

    // Derived: selected team, or nil if selectedTeamId doesn't match any team
    private var selected: Team? {
        teams.first { $0.id == selectedTeamId }
    }

    // Genders present
    private var genders: [String] {
        TeamSelectorHelpers.gendersPresent(in: teams)
    }

    // Label text
    private var labelText: String {
        isAdmin ? "Reserving for (admin — any team)" : "Reserving for"
    }

    // Trigger text: current selection (disambiguated across all teams) or placeholder
    private var triggerText: String {
        guard let team = selected else { return "Select a team" }
        return TeamSelectorHelpers.disambiguatedLabel(team, in: teams)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Top label
            Text(labelText)
                .font(.system(size: 10, weight: .heavy))
                .foregroundColor(slate)
                .textCase(.uppercase)
                .tracking(1.5)

            Menu {
                teamMenuContent
            } label: {
                HStack(spacing: 8) {
                    Text(triggerText)
                        .font(Theme.display(15))
                        .foregroundColor(selected == nil ? slate : Theme.ink)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(slate)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(border, lineWidth: 1)
                )
                .cornerRadius(10)
            }
        }
    }

    // MARK: - Menu content (gender → birth year → team; single-gender flattens)

    @ViewBuilder
    private var teamMenuContent: some View {
        if genders.count > 1 {
            ForEach(genders, id: \.self) { gender in
                Menu(gender) {
                    yearMenus(for: gender)
                }
            }
        } else if let gender = genders.first {
            yearMenus(for: gender)
        }
    }

    @ViewBuilder
    private func yearMenus(for gender: String) -> some View {
        ForEach(TeamSelectorHelpers.birthYears(for: gender, in: teams), id: \.self) { year in
            let group = TeamSelectorHelpers.teamsForYear(gender, year, in: teams)
            Menu(String(year)) {
                ForEach(group) { team in
                    teamButton(team, in: group)
                }
            }
        }
    }

    @ViewBuilder
    private func teamButton(_ team: Team, in group: [Team]) -> some View {
        Button {
            selectedTeamId = team.id
        } label: {
            let name = TeamSelectorHelpers.disambiguatedLabel(team, in: group)
            if selectedTeamId == team.id {
                Label(name, systemImage: "checkmark")
            } else {
                Text(name)
            }
        }
    }
}
