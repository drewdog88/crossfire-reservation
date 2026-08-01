import SwiftUI

struct MyFieldsView: View {
    @EnvironmentObject var session: Session
    @EnvironmentObject var weekState: WeekState

    @State private var sortKey: SortKey = .day
    @State private var sortDir: SortDir = .asc
    @State private var selectedKeys = Set<String>()
    @State private var busy = false
    @State private var editingRow: ResRow?
    @State private var confirmBulkDelete = false
    @State private var bulkDeleteFailures: [String] = []
    @State private var showBulkDeleteFailure = false
    @State private var cancelRow: ResRow?
    @State private var showCancelConfirm = false

    enum SortKey { case day, time, field, location, team }
    enum SortDir { case asc, desc }

    // MARK: - Derived State

    private var weekDates: [Date] { Formatting.weekDates(offset: weekState.offset) }
    private var weekDateSet: Set<String> { Set(weekDates.map { Formatting.dateToStr($0) }) }
    private var fieldMap: [String: Field] { Dictionary(uniqueKeysWithValues: session.catalog.fields.map { ($0.id, $0) }) }
    private var locationMap: [String: Location] { Dictionary(uniqueKeysWithValues: session.catalog.locations.map { ($0.id, $0) }) }
    private var teamMap: [String: Team] { Dictionary(uniqueKeysWithValues: session.catalog.teams.map { ($0.id, $0) }) }
    private var isAdmin: Bool { session.isAdmin }
    private var myTeamIds: Set<String> { Set(session.user?.teamIds ?? []) }

    private var reservableTeams: [Team] {
        let teams = isAdmin
            ? session.catalog.teams
            : session.catalog.teams.filter { myTeamIds.contains($0.id) }
        return teams.sorted { a, b in
            a.label.localizedCompare(b.label) == .orderedAscending
        }
    }

    private var rows: [ResRow] {
        session.catalog.slots
            .filter { slot in
                weekDateSet.contains(slot.date) && fieldMap[slot.fieldId] != nil
            }
            .flatMap { slot in
                slot.reservedTeamIds
                    .filter { teamId in isAdmin || myTeamIds.contains(teamId) }
                    .map { teamId in
                        let f = fieldMap[slot.fieldId]!
                        let team = teamMap[teamId]
                        return ResRow(
                            key: "\(slot.id):\(teamId)",
                            slot: slot,
                            teamId: teamId,
                            day: slot.date,
                            time: slot.startTime,
                            field: f.name,
                            fieldType: f.type,
                            location: locationMap[f.locationId]?.name ?? "",
                            team: team?.label ?? teamId
                        )
                    }
            }
    }

    private var sortedRows: [ResRow] {
        rows.sorted { a, b in
            let dir = sortDir == .asc ? 1 : -1
            let primary: ComparisonResult
            switch sortKey {
            case .day:
                primary = a.day.localizedCompare(b.day)
                if primary != .orderedSame {
                    return (primary == .orderedAscending) == (dir == 1)
                }
                let time = a.time.localizedCompare(b.time)
                return (time == .orderedAscending) == (dir == 1)
            case .time:
                primary = a.time.localizedCompare(b.time)
                if primary != .orderedSame {
                    return (primary == .orderedAscending) == (dir == 1)
                }
                let day = a.day.localizedCompare(b.day)
                return (day == .orderedAscending) == (dir == 1)
            case .field:
                primary = a.field.localizedCompare(b.field)
            case .location:
                primary = a.location.localizedCompare(b.location)
            case .team:
                primary = a.team.localizedCompare(b.team)
            }
            if primary != .orderedSame {
                return (primary == .orderedAscending) == (dir == 1)
            }
            // Tie-break
            let dayTie = a.day.localizedCompare(b.day)
            if dayTie != .orderedSame {
                return (dayTie == .orderedAscending) == (dir == 1)
            }
            let timeTie = a.time.localizedCompare(b.time)
            if timeTie != .orderedSame {
                return (timeTie == .orderedAscending) == (dir == 1)
            }
            let keyTie = a.key.localizedCompare(b.key)
            return (keyTie == .orderedAscending) == (dir == 1)
        }
    }

    private var visibleKeys: [String] { sortedRows.map { $0.key } }
    private var allSelected: Bool {
        !visibleKeys.isEmpty && visibleKeys.allSatisfy { selectedKeys.contains($0) }
    }
    private var selectedRows: [ResRow] {
        sortedRows.filter { selectedKeys.contains($0.key) }
    }

    // MARK: - Body

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(spacing: 0) {
                    WeekNav()

                    VStack(spacing: 12) {
                        HStack(alignment: .center) {
                            Text(isAdmin ? "All Reservations" : "My Reservations")
                                .font(Theme.display(20))
                                .foregroundColor(Theme.ink)

                            Spacer()

                            if !selectedRows.isEmpty {
                                Button {
                                    confirmBulkDelete = true
                                } label: {
                                    Text(busy ? "…" : "Delete selected (\(selectedRows.count))")
                                        .font(Theme.sans(14))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(Color.red)
                                        .cornerRadius(6)
                                }
                                .disabled(busy)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                        if sortedRows.isEmpty {
                            EmptyState(
                                icon: "🗓",
                                message: isAdmin
                                    ? "No teams have reserved a field this week yet."
                                    : "No field reservations for this week. Go to Reserve to book a spot."
                            )
                            .padding(.top, 32)
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                VStack(spacing: 0) {
                                    // Header
                                    HStack(spacing: 0) {
                                        Button {
                                            toggleAll()
                                        } label: {
                                            Image(systemName: allSelected ? "checkmark.square.fill" : "square")
                                                .foregroundColor(Theme.ink.opacity(0.6))
                                                .font(.system(size: 16))
                                        }
                                        .frame(width: 40)
                                        .padding(.vertical, 8)
                                        .background(Color(red: 0xf8/255, green: 0xfa/255, blue: 0xfc/255))

                                        HeaderCell(title: "Day", active: sortKey == .day, dir: sortDir) {
                                            toggleSort(.day)
                                        }

                                        HeaderCell(title: "Time", active: sortKey == .time, dir: sortDir) {
                                            toggleSort(.time)
                                        }

                                        HeaderCell(title: "Field", active: sortKey == .field, dir: sortDir) {
                                            toggleSort(.field)
                                        }

                                        HeaderCell(title: "Location", active: sortKey == .location, dir: sortDir) {
                                            toggleSort(.location)
                                        }

                                        HeaderCell(title: "Team", active: sortKey == .team, dir: sortDir) {
                                            toggleSort(.team)
                                        }

                                        Text("Actions")
                                            .font(Theme.display(11))
                                            .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))
                                            .frame(minWidth: 140, alignment: .trailing)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(Color(red: 0xf8/255, green: 0xfa/255, blue: 0xfc/255))
                                    }
                                    .frame(height: 36)
                                    .background(Color(red: 0xf8/255, green: 0xfa/255, blue: 0xfc/255))
                                    .overlay(
                                        Rectangle()
                                            .fill(Color.gray.opacity(0.2))
                                            .frame(height: 1),
                                        alignment: .bottom
                                    )

                                    // Rows
                                    ForEach(sortedRows, id: \.key) { row in
                                        RowView(
                                            row: row,
                                            selected: selectedKeys.contains(row.key),
                                            busy: busy,
                                            onToggle: { toggleRow(row.key) },
                                            onEdit: { editingRow = row },
                                            onCancel: {
                                                cancelRow = row
                                                showCancelConfirm = true
                                            }
                                        )
                                    }
                                }
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                    .padding(.bottom, 100)
                }
            }
            .background(Theme.pageBg)
        }
        .confirmationDialog(
            "Cancel \(selectedRows.count) reservation\(selectedRows.count == 1 ? "" : "s")?",
            isPresented: $confirmBulkDelete,
            titleVisibility: .visible
        ) {
            Button("Cancel Reservations", role: .destructive) {
                handleBulkDelete()
            }
            Button("Keep", role: .cancel) {}
        }
        .confirmationDialog(
            "Cancel this reservation?",
            isPresented: $showCancelConfirm,
            titleVisibility: .visible
        ) {
            Button("Cancel Reservation", role: .destructive) {
                if let row = cancelRow {
                    handleCancelOne(row)
                }
            }
            Button("Keep", role: .cancel) {}
        }
        .alert("Some cancellations failed", isPresented: $showBulkDeleteFailure) {
            Button("OK") { bulkDeleteFailures = [] }
        } message: {
            Text(bulkDeleteFailures.joined(separator: "\n"))
        }
        .sheet(item: $editingRow) { row in
            EditReservationView(
                row: row,
                teams: reservableTeams,
                fields: session.catalog.fields,
                locations: session.catalog.locations,
                slots: session.catalog.slots,
                onClose: { editingRow = nil }
            )
        }
    }

    // MARK: - Actions

    private func toggleSort(_ key: SortKey) {
        if key == sortKey {
            sortDir = sortDir == .asc ? .desc : .asc
        } else {
            sortKey = key
            sortDir = .asc
        }
    }

    private func toggleRow(_ key: String) {
        if selectedKeys.contains(key) {
            selectedKeys.remove(key)
        } else {
            selectedKeys.insert(key)
        }
    }

    private func toggleAll() {
        if allSelected {
            selectedKeys.removeAll()
        } else {
            selectedKeys = Set(visibleKeys)
        }
    }

    private func handleCancelOne(_ row: ResRow) {
        Task {
            busy = true
            defer { busy = false }
            do {
                _ = try await APIClient.shared.cancel(slotId: row.slot.id, teamId: row.teamId)
                await session.refreshCatalog()
                selectedKeys.remove(row.key)
            } catch let error as APIError {
                // Show failure in a simple alert
                bulkDeleteFailures = [error.message]
                showBulkDeleteFailure = true
            }
        }
    }

    private func handleBulkDelete() {
        Task {
            busy = true
            var failures: [String] = []
            for row in selectedRows {
                do {
                    _ = try await APIClient.shared.cancel(slotId: row.slot.id, teamId: row.teamId)
                } catch let error as APIError {
                    failures.append("\(row.team): \(error.message)")
                }
            }
            busy = false
            await session.refreshCatalog()
            selectedKeys.removeAll()
            if !failures.isEmpty {
                bulkDeleteFailures = failures
                showBulkDeleteFailure = true
            }
        }
    }
}

// MARK: - ResRow

struct ResRow: Identifiable {
    let key: String
    let slot: SlotConfig
    let teamId: String
    let day: String
    let time: String
    let field: String
    let fieldType: Surface
    let location: String
    let team: String

    var id: String { key }
}

// MARK: - HeaderCell

private struct HeaderCell: View {
    let title: String
    let active: Bool
    let dir: MyFieldsView.SortDir
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Text(title.uppercased())
                    .font(Theme.display(11))
                    .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))
                if active {
                    Text(dir == .asc ? "▲" : "▼")
                        .font(.system(size: 9))
                        .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))
                }
            }
            .frame(minWidth: 100, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }
}

// MARK: - RowView

private struct RowView: View {
    let row: ResRow
    let selected: Bool
    let busy: Bool
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onCancel: () -> Void

    private func surfaceLabel(_ surface: Surface) -> String {
        switch surface {
        case .turf: return "TURF"
        case .grass: return "GRASS"
        case .unknown: return "UNKNOWN"
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onToggle) {
                Image(systemName: selected ? "checkmark.square.fill" : "square")
                    .foregroundColor(Theme.ink.opacity(0.6))
                    .font(.system(size: 16))
            }
            .frame(width: 40)
            .padding(.vertical, 10)
            .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)

            Text(Formatting.formatDisplayDate(row.day))
                .font(Theme.sans(14))
                .foregroundColor(Color(red: 0x33/255, green: 0x41/255, blue: 0x55/255))
                .frame(minWidth: 100, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)

            Text(Formatting.timeRangeLabel(start: row.slot.startTime, end: row.slot.endTime))
                .font(Theme.sans(14))
                .foregroundColor(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                .frame(minWidth: 100, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)

            VStack(alignment: .leading, spacing: 2) {
                Text(row.field)
                    .font(Theme.display(14))
                    .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                Text(surfaceLabel(row.fieldType))
                    .font(.system(size: 10))
                    .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))
            }
            .frame(minWidth: 100, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)

            Text(row.location.isEmpty ? "—" : row.location)
                .font(Theme.sans(14))
                .foregroundColor(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                .frame(minWidth: 100, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)

            Text(row.team)
                .font(Theme.display(14))
                .foregroundColor(Theme.cfGreen)
                .frame(minWidth: 100, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)

            HStack(spacing: 6) {
                Button {
                    onEdit()
                } label: {
                    Text("Edit")
                        .font(Theme.sans(12))
                        .foregroundColor(Theme.ink)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color(red: 0xe5/255, green: 0xe7/255, blue: 0xeb/255))
                        .cornerRadius(4)
                }
                .disabled(busy)

                Button {
                    onCancel()
                } label: {
                    Text("Cancel")
                        .font(Theme.sans(12))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.red)
                        .cornerRadius(4)
                }
                .disabled(busy)
            }
            .frame(minWidth: 140, alignment: .trailing)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)
        }
        .background(selected ? Theme.cfGreen.opacity(0.05) : Color.clear)
        .overlay(
            Rectangle()
                .fill(Color.gray.opacity(0.15))
                .frame(height: 1),
            alignment: .bottom
        )
    }
}
