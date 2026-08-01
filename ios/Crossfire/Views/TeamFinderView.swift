import SwiftUI

struct TeamFinderView: View {
    let teams: [Team]
    let fields: [Field]
    let locations: [Location]
    let slots: [SlotConfig]

    @State private var query = ""

    var body: some View {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()

        VStack(spacing: 0) {
            // Search box
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                    .font(.system(size: 14))

                TextField("Find your team or coach (e.g. B14 D, Rafael)", text: $query)
                    .font(Theme.sans(14))
                    .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                    .tint(Theme.cfGreen)

                if !query.isEmpty {
                    Button {
                        query = ""
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                            .font(.system(size: 12))
                    }
                }
            }
            .padding(8)
            .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255), lineWidth: 1)
            )
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)

            // Results panel (only when q.count >= 2)
            if q.count >= 2 {
                resultsPanel(q: q)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }
        }
        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
    }

    @ViewBuilder
    private func resultsPanel(q: String) -> some View {
        let results = computeResults(q: q)

        VStack(spacing: 0) {
            if results.isEmpty {
                // Empty state with curly quotes around RAW query (U+201C / U+201D)
                Text("No practices found for \u{201C}\(query)\u{201D}.")
                    .font(Theme.sans(14))
                    .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                // Header with count
                HStack {
                    Text("\(results.count) practice\(results.count == 1 ? "" : "s")")
                        .font(Theme.display(10))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                        .textCase(.uppercase)
                        .tracking(1.5)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))

                Rectangle()
                    .fill(Color(red: 0x33/255, green: 0x41/255, blue: 0x55/255))
                    .frame(height: 0.5)

                // Results list
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(results, id: \.key) { row in
                            VStack(spacing: 0) {
                                resultRow(row)
                                if row.key != results.last?.key {
                                    Rectangle()
                                        .fill(Color(red: 0x33/255, green: 0x41/255, blue: 0x55/255).opacity(0.7))
                                        .frame(height: 0.5)
                                }
                            }
                        }
                    }
                }
                .frame(maxHeight: 400)
            }
        }
        .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255).opacity(0.6), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func resultRow(_ row: PracticeRow) -> some View {
        let loc = row.field.flatMap { f in locations.first { $0.id == f.locationId } }
        let locName = loc?.name ?? "Unknown"
        let fieldName = row.field?.name ?? ""

        HStack(alignment: .firstTextBaseline, spacing: 8) {
            // Date (bold, fixed leading width)
            Text(Formatting.formatDisplayDate(row.date))
                .font(Theme.display(14))
                .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                .frame(width: 100, alignment: .leading)

            // Time + location + field
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(Formatting.timeRangeLabel(start: row.slot.startTime, end: row.slot.endTime))
                        .font(Theme.sans(14))
                        .foregroundColor(Color(red: 0xcb/255, green: 0xd5/255, blue: 0xe1/255))

                    Text("·")
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    Text("\(locName)\(!fieldName.isEmpty ? " \(fieldName)" : "")")
                        .font(Theme.sans(14))
                        .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                }
            }

            Spacer()

            // Team label + coach (right-aligned, cf-green)
            Text(row.team.label + (row.team.coachName.map { " (\($0))" } ?? ""))
                .font(Theme.sans(14).weight(.medium))
                .foregroundColor(Theme.cfGreen)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private func computeResults(q: String) -> [PracticeRow] {
        let words = q.split(separator: " ").map(String.init).filter { !$0.isEmpty }
        guard !words.isEmpty else { return [] }

        // Build team map
        let teamMap = Dictionary(uniqueKeysWithValues: teams.map { ($0.id, $0) })
        let fieldMap = Dictionary(uniqueKeysWithValues: fields.map { ($0.id, $0) })

        // Match teams
        let matchedTeamIds = Set(teams.filter { team in
            teamMatches(team, words)
        }.map(\.id))

        guard !matchedTeamIds.isEmpty else { return [] }

        // Build rows: one per (slot, reservedTeamId) where reservedTeamId matched
        var rows: [PracticeRow] = []
        for slot in slots {
            for tid in slot.reservedTeamIds {
                guard matchedTeamIds.contains(tid), let team = teamMap[tid] else { continue }
                let field = fieldMap[slot.fieldId]
                rows.append(PracticeRow(
                    key: "\(slot.id)|\(tid)",
                    date: slot.date,
                    slot: slot,
                    team: team,
                    field: field
                ))
            }
        }

        // Sort: date DESC, then startTime DESC
        rows.sort { a, b in
            if a.date != b.date {
                return a.date > b.date  // later date first
            }
            return a.slot.startTime > b.slot.startTime  // later start first
        }

        return rows
    }

    private func teamMatches(_ team: Team, _ words: [String]) -> Bool {
        let hay = [
            team.label,
            team.coachName ?? "",
            team.gender,
            String(team.birthYear),
            String(format: "%02d", team.birthYear % 100)
        ].joined(separator: " ").lowercased()

        return words.allSatisfy { hay.contains($0) }
    }
}

private struct PracticeRow {
    let key: String
    let date: String
    let slot: SlotConfig
    let team: Team
    let field: Field?
}
