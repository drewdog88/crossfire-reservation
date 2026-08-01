import SwiftUI

struct EditReservationView: View {
    @EnvironmentObject var session: Session

    let row: ResRow
    let teams: [Team]
    let fields: [Field]
    let locations: [Location]
    let slots: [SlotConfig]
    let onClose: () -> Void

    @State private var selectedTeamId: String
    @State private var selectedSlotId: String
    @State private var busy = false
    @State private var error = ""

    init(row: ResRow, teams: [Team], fields: [Field], locations: [Location], slots: [SlotConfig], onClose: @escaping () -> Void) {
        self.row = row
        self.teams = teams
        self.fields = fields
        self.locations = locations
        self.slots = slots
        self.onClose = onClose
        _selectedTeamId = State(initialValue: row.teamId)
        _selectedSlotId = State(initialValue: row.slot.id)
    }

    private var fieldMap: [String: Field] {
        Dictionary(uniqueKeysWithValues: fields.map { ($0.id, $0) })
    }

    private var locationMap: [String: Location] {
        Dictionary(uniqueKeysWithValues: locations.map { ($0.id, $0) })
    }

    private var slotOptions: [SlotConfig] {
        slots
            .filter { slot in
                fieldMap[slot.fieldId] != nil
            }
            .filter { slot in
                slot.id == row.slot.id || slot.reservedTeamIds.count < slot.maxTeams
            }
            .sorted(by: compareSlots)
    }

    private func compareSlots(_ a: SlotConfig, _ b: SlotConfig) -> Bool {
        if a.date != b.date {
            return a.date.localizedCompare(b.date) == .orderedAscending
        }
        if a.startTime != b.startTime {
            return a.startTime.localizedCompare(b.startTime) == .orderedAscending
        }
        let aName = fieldMap[a.fieldId]?.name ?? ""
        let bName = fieldMap[b.fieldId]?.name ?? ""
        return aName.localizedCompare(bName) == .orderedAscending
    }

    private func slotLabel(_ slot: SlotConfig) -> String {
        guard let field = fieldMap[slot.fieldId] else { return "" }
        let loc = locationMap[field.locationId]
        let open = max(0, slot.maxTeams - slot.reservedTeamIds.count)
        let tag: String
        if slot.id == row.slot.id {
            tag = " (current)"
        } else if open == 0 {
            tag = " (full)"
        } else {
            tag = " · \(open) open"
        }
        return "\(Formatting.formatDisplayDate(slot.date)) · \(Formatting.timeRangeLabel(start: slot.startTime, end: slot.endTime)) — \(field.name), \(loc?.name ?? "—")\(tag)"
    }

    private func teamLabel(_ team: Team) -> String {
        if let coachName = team.coachName {
            return "\(team.label) — \(coachName)"
        } else {
            return team.label
        }
    }

    private var changed: Bool {
        selectedTeamId != row.teamId || selectedSlotId != row.slot.id
    }

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 16) {
                if !error.isEmpty {
                    Text(error)
                        .font(Theme.sans(14))
                        .foregroundColor(.white)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red)
                        .cornerRadius(8)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Team")
                        .font(.system(size: 12))
                        .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))

                    Picker("", selection: $selectedTeamId) {
                        ForEach(teams, id: \.id) { team in
                            Text(teamLabel(team))
                                .tag(team.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Day · Time · Field · Location")
                        .font(.system(size: 12))
                        .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))

                    Picker("", selection: $selectedSlotId) {
                        ForEach(slotOptions, id: \.id) { slot in
                            Text(slotLabel(slot))
                                .tag(slot.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Spacer()

                HStack(spacing: 12) {
                    Button("Cancel") {
                        onClose()
                    }
                    .font(Theme.sans(14))
                    .foregroundColor(Theme.ink)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color(red: 0xe5/255, green: 0xe7/255, blue: 0xeb/255))
                    .cornerRadius(8)
                    .disabled(busy)

                    Spacer()

                    Button {
                        handleSave()
                    } label: {
                        Text(busy ? "Saving…" : "Save changes")
                            .font(Theme.sans(14))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(changed && !busy ? Theme.cfGreen : Color.gray)
                            .cornerRadius(8)
                    }
                    .disabled(!changed || busy)
                }
            }
            .padding()
            .navigationTitle("Edit Reservation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        onClose()
                    }
                }
            }
        }
    }

    private func handleSave() {
        guard changed else {
            onClose()
            return
        }
        Task {
            busy = true
            error = ""
            do {
                _ = try await APIClient.shared.moveReservation(
                    slotId: row.slot.id,
                    teamId: row.teamId,
                    newSlotId: selectedSlotId,
                    newTeamId: selectedTeamId
                )
                await session.refreshCatalog()
                onClose()
            } catch let apiError as APIError {
                self.error = apiError.message
                busy = false
            } catch {
                self.error = "An unexpected error occurred."
                busy = false
            }
        }
    }
}
