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

    // Derived: selected team, or nil if selectedTeamId doesn't match any team
    private var selected: Team? {
        teams.first { $0.id == selectedTeamId }
    }

    // Cascade gate
    private var useCascade: Bool {
        TeamSelectorHelpers.useCascade(teams.count)
    }

    // Genders present
    private var genders: [String] {
        TeamSelectorHelpers.gendersPresent(in: teams)
    }

    // Active gender: selected?.gender if valid, else first in genders
    private var activeGender: String {
        if let g = selected?.gender, genders.contains(g) {
            return g
        }
        return genders.first ?? "Boys"
    }

    // Years for active gender
    private var years: [Int] {
        TeamSelectorHelpers.birthYears(for: activeGender, in: teams)
    }

    // Active year: selected?.birthYear if valid for active gender, else first in years
    private var activeYear: Int {
        if let y = selected?.birthYear, years.contains(y) {
            return y
        }
        return years.first ?? 2014
    }

    // Teams for active gender+year
    private var teamsForYear: [Team] {
        TeamSelectorHelpers.teamsForYear(activeGender, activeYear, in: teams)
    }

    // Label text
    private var labelText: String {
        isAdmin ? "Reserving for (admin — any team)" : "Reserving for"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top label
            Text(labelText)
                .font(.system(size: 10, weight: .heavy))
                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                .textCase(.uppercase)
                .tracking(1.5)
                .padding(.bottom, 6)

            if useCascade {
                // Cascade rows: Gender (hidden if single) → Age → Team
                VStack(spacing: 8) {
                    if genders.count > 1 {
                        CascadeRow(
                            rowLabel: "Gender",
                            chips: genders.map { ChipData(id: $0, label: $0, isActive: $0 == activeGender) },
                            onTap: { pickGender($0) }
                        )
                    }

                    CascadeRow(
                        rowLabel: "Age",
                        chips: years.map { ChipData(id: "\($0)", label: "\($0)", isActive: $0 == activeYear) },
                        onTap: { pickYear(Int($0)!) }
                    )

                    CascadeRow(
                        rowLabel: "Team",
                        chips: teamsForYear.map { t in
                            ChipData(
                                id: t.id,
                                label: TeamSelectorHelpers.disambiguatedLabel(t, in: teamsForYear),
                                isActive: selectedTeamId == t.id
                            )
                        },
                        onTap: { selectedTeamId = $0 }
                    )
                }
            } else {
                // Single wrapping pill row (≤6 teams)
                FlowLayout(spacing: 8) {
                    ForEach(teams) { team in
                        SelectorChip(
                            label: team.label,
                            isActive: selectedTeamId == team.id,
                            onTap: { selectedTeamId = team.id }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Cascade Navigation

    /// When gender changes, keep current pick if it still fits, else select first team in new gender.
    private func pickGender(_ g: String) {
        if selected?.gender == g { return }
        let firstYear = TeamSelectorHelpers.birthYears(for: g, in: teams).first ?? 2014
        let first = TeamSelectorHelpers.teamsForYear(g, firstYear, in: teams).first
        if let first = first {
            selectedTeamId = first.id
        }
    }

    /// When year changes, keep current pick if it still fits, else select first team in new year.
    private func pickYear(_ y: Int) {
        if selected?.birthYear == y && selected?.gender == activeGender { return }
        let first = TeamSelectorHelpers.teamsForYear(activeGender, y, in: teams).first
        if let first = first {
            selectedTeamId = first.id
        }
    }
}

// MARK: - Supporting Views

private struct ChipData: Identifiable {
    let id: String
    let label: String
    let isActive: Bool
}

private struct CascadeRow: View {
    let rowLabel: String
    let chips: [ChipData]
    let onTap: (String) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text(rowLabel)
                .font(.system(size: 10, weight: .heavy))
                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                .textCase(.uppercase)
                .tracking(1.5)
                .frame(width: 48, alignment: .leading)
                .fixedSize()

            FlowLayout(spacing: 8) {
                ForEach(chips) { chip in
                    SelectorChip(
                        label: chip.label,
                        isActive: chip.isActive,
                        onTap: { onTap(chip.id) }
                    )
                }
            }
        }
    }
}

private struct SelectorChip: View {
    let label: String
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(label)
                .font(Theme.display(14))
                .foregroundColor(isActive ? .white : Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isActive ? Theme.cfGreen : Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                .cornerRadius(8)
        }
    }
}

/// Simple flow layout that wraps chips horizontally.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                       y: bounds.minY + result.positions[index].y),
                          proposal: .unspecified)
        }
    }

    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                // Wrap to next line
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
            totalWidth = max(totalWidth, currentX - spacing)
        }

        let totalHeight = currentY + lineHeight
        return (CGSize(width: totalWidth, height: totalHeight), positions)
    }
}
