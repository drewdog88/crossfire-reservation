import SwiftUI

struct ReserveView: View {
    @EnvironmentObject var session: Session
    @EnvironmentObject var weekState: WeekState
    @State private var selectedLocationId = "all"
    @State private var selectedTeamId: String = ""
    @State private var toast: Toast?

    let onShowMap: (String) -> Void

    // MARK: - Derived State

    private var weekDates: [Date] { Formatting.weekDates(offset: weekState.offset) }
    private var weekDateSet: Set<String> { Set(weekDates.map { Formatting.dateToStr($0) }) }
    private var fieldMap: [String: Field] { Dictionary(uniqueKeysWithValues: session.catalog.fields.map { ($0.id, $0) }) }
    private var locationMap: [String: Location] { Dictionary(uniqueKeysWithValues: session.catalog.locations.map { ($0.id, $0) }) }
    private var teamsById: [String: Team] { Dictionary(uniqueKeysWithValues: session.catalog.teams.map { ($0.id, $0) }) }

    private var reservableTeams: [Team] {
        guard let user = session.user else { return [] }
        if session.isAdmin {
            return session.catalog.teams.sorted { a, b in
                a.label.localizedCompare(b.label) == .orderedAscending
            }
        } else {
            // Coach's teams, in teamIds order, dropping any not in catalog
            return user.teamIds.compactMap { id in teamsById[id] }
        }
    }

    private var weekReservations: [SlotConfig] {
        session.catalog.slots.filter { slot in
            weekDateSet.contains(slot.date) && slot.reservedTeamIds.contains(selectedTeamId)
        }
    }

    private var reservedDates: Set<String> {
        Set(weekReservations.map { $0.date })
    }

    private var weekSlots: [SlotConfig] {
        session.catalog.slots
            .filter { slot in
                weekDateSet.contains(slot.date) &&
                fieldMap[slot.fieldId] != nil &&
                (selectedLocationId == "all" || fieldMap[slot.fieldId]?.locationId == selectedLocationId)
            }
            .sorted(by: compareSlots)
    }

    private var sortedEntries: [(key: String, value: [SlotConfig])] {
        let byDate = Dictionary(grouping: weekSlots, by: { $0.date })
        return byDate.sorted(by: { $0.key < $1.key })
    }

    // MARK: - Body

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(spacing: 0) {
                    WeekNav()

                    // Empty state: no teams
                    if reservableTeams.isEmpty {
                        EmptyState(
                            icon: "⚽",
                            message: "You have no teams assigned. Contact an admin to be assigned to a team."
                        )
                        .padding(.top, 32)
                    } else {
                        // Controls strip
                        VStack(spacing: 12) {
                            if reservableTeams.count > 1 {
                                TeamSelector(
                                    teams: reservableTeams,
                                    selectedTeamId: Binding(
                                        get: { selectedTeamId.isEmpty ? nil : selectedTeamId },
                                        set: { selectedTeamId = $0 ?? "" }
                                    ),
                                    isAdmin: session.isAdmin
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)

                        LocationFilterChips(
                            locations: session.catalog.locations,
                            selectedId: $selectedLocationId
                        )

                        // Content
                        VStack(spacing: 16) {
                            if sortedEntries.isEmpty {
                                EmptyState(
                                    icon: "📋",
                                    message: "No fields available this week. Try a different week or location."
                                )
                                .padding(.top, 32)
                            } else {
                                let myTeamIds = Set(session.user?.teamIds ?? [])
                                ForEach(sortedEntries.indices, id: \.self) { idx in
                                    ReserveDaySection(
                                        dateStr: sortedEntries[idx].key,
                                        dateSlots: sortedEntries[idx].value,
                                        fieldMap: fieldMap,
                                        locationMap: locationMap,
                                        teamsById: teamsById,
                                        selectedTeamId: selectedTeamId,
                                        reservedDates: reservedDates,
                                        myTeamIds: myTeamIds,
                                        onReserve: { slot in
                                            handleReserve(slotId: slot.id)
                                        },
                                        onCancel: { slot in
                                            handleCancel(slotId: slot.id, teamId: selectedTeamId)
                                        },
                                        onShowMap: onShowMap
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 24)
                    }
                }
            }
            .background(Color(red: 0xf8/255, green: 0xfa/255, blue: 0xfc/255))

            // Toast overlay
            if let toast = toast {
                ToastView(toast: toast)
                    .padding(.top, 120)
                    .padding(.horizontal, 16)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                    .animation(.easeInOut(duration: 0.3), value: toast.id)
            }
        }
        .onAppear {
            // Initialize selectedTeamId on first appear
            if selectedTeamId.isEmpty && !reservableTeams.isEmpty {
                selectedTeamId = reservableTeams[0].id
            }
        }
        .onChange(of: reservableTeams) { oldValue, newValue in
            // Update selection when teams change
            if selectedTeamId.isEmpty && !newValue.isEmpty {
                selectedTeamId = newValue[0].id
            } else if !selectedTeamId.isEmpty && !newValue.contains(where: { $0.id == selectedTeamId }) {
                selectedTeamId = newValue.first?.id ?? ""
            }
        }
    }

    // MARK: - Helpers

    private func compareSlots(_ a: SlotConfig, _ b: SlotConfig) -> Bool {
        if a.date != b.date {
            return a.date < b.date
        }
        if a.startTime != b.startTime {
            return a.startTime < b.startTime
        }
        let aName = fieldMap[a.fieldId]?.name ?? ""
        let bName = fieldMap[b.fieldId]?.name ?? ""
        return aName.localizedCompare(bName) == .orderedAscending
    }

    private func showToast(_ message: String, ok: Bool) {
        toast = Toast(id: UUID(), message: message, ok: ok)
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            toast = nil
        }
    }

    private func handleReserve(slotId: String) {
        Task {
            do {
                _ = try await APIClient.shared.reserve(slotId: slotId, teamId: selectedTeamId)
                await session.refreshCatalog()
                showToast("Spot reserved! 🎉", ok: true)
            } catch let error as APIError {
                showToast(error.message, ok: false)
            } catch {
                showToast("An unexpected error occurred.", ok: false)
            }
        }
    }

    private func handleCancel(slotId: String, teamId: String) {
        Task {
            do {
                _ = try await APIClient.shared.cancel(slotId: slotId, teamId: teamId)
                await session.refreshCatalog()
                showToast("Reservation cancelled.", ok: true)
            } catch let error as APIError {
                showToast(error.message, ok: false)
            } catch {
                showToast("An unexpected error occurred.", ok: false)
            }
        }
    }
}

// MARK: - Reserve Day Section

private struct ReserveDaySection: View {
    let dateStr: String
    let dateSlots: [SlotConfig]
    let fieldMap: [String: Field]
    let locationMap: [String: Location]
    let teamsById: [String: Team]
    let selectedTeamId: String
    let reservedDates: Set<String>
    let myTeamIds: Set<String>
    let onReserve: (SlotConfig) -> Void
    let onCancel: (SlotConfig) -> Void
    let onShowMap: (String) -> Void

    var body: some View {
        VStack(spacing: 16) {
            DayHeader(dateStr: dateStr)

            ForEach(dateSlots, id: \.id) { slot in
                if let field = fieldMap[slot.fieldId] {
                    let myReservation = slot.reservedTeamIds.contains(selectedTeamId)
                    let dayBooked = !myReservation && reservedDates.contains(slot.date)

                    FieldPitchView(
                        slot: slot,
                        field: field,
                        location: locationMap[field.locationId],
                        teamsById: teamsById,
                        mode: .reserve,
                        myTeamId: selectedTeamId,
                        myTeamIds: myTeamIds,
                        dayBooked: dayBooked,
                        onReserve: { onReserve(slot) },
                        onCancel: { onCancel(slot) },
                        onShowMap: onShowMap
                    )
                }
            }
        }
    }
}

// MARK: - Toast

private struct Toast: Identifiable, Equatable {
    let id: UUID
    let message: String
    let ok: Bool
}

private struct ToastView: View {
    let toast: Toast

    var body: some View {
        HStack {
            Text(toast.message)
                .font(Theme.sans(14))
                .foregroundColor(.white)
                .multilineTextAlignment(.leading)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(toast.ok ? Theme.cfGreen : Color.red)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.3), radius: 10, x: 0, y: 4)
    }
}
