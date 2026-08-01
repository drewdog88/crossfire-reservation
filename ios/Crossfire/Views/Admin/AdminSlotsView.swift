import SwiftUI

struct AdminSlotsView: View {
    let slots: [SlotConfig]
    let fields: [Field]
    let locations: [Location]
    let teams: [Team]
    let refresh: () async -> Void

    @EnvironmentObject var weekState: WeekState

    // Form state
    @State private var fieldId: String = ""
    @State private var dateSelection: Date = Date()
    @State private var startTime: String = "17:30"
    @State private var endTime: String = "19:00"
    @State private var maxTeams: Int = 4

    @State private var errorMessage: String?
    @State private var deleteConfirmSlotId: String?
    @State private var addOverrideSelections: [String: String] = [:]  // slotId → teamId

    var body: some View {
        VStack(spacing: 16) {
            // Week nav
            WeekNav()

            // Add form card
            VStack(alignment: .leading, spacing: 12) {
                Text("Add Slot")
                    .font(Theme.display(16))
                    .tracking(0.5)
                    .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))

                // Field picker (full width)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Field")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    Picker("Field", selection: $fieldId) {
                        ForEach(fields) { f in
                            let loc = locationMap[f.locationId]
                            Text("\(loc?.name ?? "") — \(f.name)")
                                .tag(f.id)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                    .cornerRadius(6)
                }

                // Date + Max Teams row
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Date")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        DatePicker("Date", selection: $dateSelection, displayedComponents: .date)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Max Teams (1–8)")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("Max Teams", text: Binding(
                            get: { String(maxTeams) },
                            set: { newValue in
                                if let v = Int(newValue), (1...8).contains(v) {
                                    maxTeams = v
                                }
                            }
                        ))
                        .keyboardType(.numberPad)
                        .font(Theme.sans(14))
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                    }
                }

                // Start Time + End Time row
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Start Time")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        DatePicker("Start Time", selection: timeBinding($startTime), displayedComponents: .hourAndMinute)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("End Time")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        DatePicker("End Time", selection: timeBinding($endTime), displayedComponents: .hourAndMinute)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }
                }

                // Submit button
                Button(action: addSlot) {
                    Text("Add Slot")
                        .font(Theme.display(14))
                        .tracking(0.5)
                        .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Theme.cfGreen)
                        .cornerRadius(6)
                }
            }
            .padding(16)
            .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
            .cornerRadius(8)

            // Week slots list
            if weekSlots.isEmpty {
                emptyState
            } else {
                VStack(spacing: 8) {
                    ForEach(weekSlots) { slot in
                        slotCard(slot)
                    }
                }
            }
        }
        .onAppear {
            if fieldId.isEmpty {
                fieldId = fields.first?.id ?? ""
            }
            resetDate()
        }
        .onChange(of: weekState.offset) { _, _ in
            resetDate()
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
        .confirmationDialog(
            "Delete this slot? Its reservations will be removed.",
            isPresented: .constant(deleteConfirmSlotId != nil),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let id = deleteConfirmSlotId {
                    deleteConfirmSlotId = nil
                    Task { await delSlot(id: id) }
                }
            }
            Button("Cancel", role: .cancel) {
                deleteConfirmSlotId = nil
            }
        }
    }

    // MARK: - Computed

    private var fieldMap: [String: Field] {
        Dictionary(uniqueKeysWithValues: fields.map { ($0.id, $0) })
    }

    private var locationMap: [String: Location] {
        Dictionary(uniqueKeysWithValues: locations.map { ($0.id, $0) })
    }

    private var teamMap: [String: Team] {
        Dictionary(uniqueKeysWithValues: teams.map { ($0.id, $0) })
    }

    private var weekDates: [Date] {
        Formatting.weekDates(offset: weekState.offset)
    }

    private var weekDateSet: Set<String> {
        Set(weekDates.map(Formatting.dateToStr))
    }

    private var weekSlots: [SlotConfig] {
        slots
            .filter { weekDateSet.contains($0.date) && fieldMap[$0.fieldId] != nil }
            .sorted(by: compareSlots)
    }

    private func compareSlots(_ a: SlotConfig, _ b: SlotConfig) -> Bool {
        if a.date != b.date {
            return a.date < b.date
        }
        if a.startTime != b.startTime {
            return a.startTime < b.startTime
        }
        let aFieldName = fieldMap[a.fieldId]?.name ?? ""
        let bFieldName = fieldMap[b.fieldId]?.name ?? ""
        return aFieldName.localizedCaseInsensitiveCompare(bFieldName) == .orderedAscending
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Text("📅")
                .font(.system(size: 48))
            Text("No slots configured for this week. Add slots above.")
                .font(Theme.sans(14))
                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
    }

    // MARK: - Slot Card

    private func slotCard(_ slot: SlotConfig) -> some View {
        let field = fieldMap[slot.fieldId]
        let loc = field.flatMap { locationMap[$0.locationId] }
        let reserved = slot.reservedTeamIds
        let avail = teams.filter { !reserved.contains($0.id) }

        return VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(loc?.name ?? "") · \(field?.name ?? "")")
                        .font(Theme.display(16))
                        .tracking(0.5)
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                    Text("\(Formatting.formatDisplayDate(slot.date)) · \(Formatting.timeRangeLabel(start: slot.startTime, end: slot.endTime))")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                }

                Spacer()

                Button(action: { deleteConfirmSlotId = slot.id }) {
                    Image(systemName: "trash")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.red)
                        .padding(8)
                        .background(Color.clear)
                        .contentShape(Rectangle())
                }
            }

            // Max Teams stepper + occupancy
            HStack(spacing: 12) {
                Text("Max Teams:")
                    .font(Theme.sans(12))
                    .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                Button(action: { updateMax(slot, slot.maxTeams - 1) }) {
                    Text("−")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                        .frame(width: 24, height: 24)
                }

                Text("\(slot.maxTeams)")
                    .font(Theme.display(14))
                    .tracking(0.5)
                    .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                    .frame(minWidth: 24)

                Button(action: { updateMax(slot, slot.maxTeams + 1) }) {
                    Text("+")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                        .frame(width: 24, height: 24)
                }

                occupancyBar(filled: reserved.count, max: slot.maxTeams)
                    .frame(maxWidth: .infinity)

                Text("\(reserved.count)/\(slot.maxTeams)")
                    .font(Theme.sans(12))
                    .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
            }

            // Reserved chips
            if !reserved.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Reserved")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    FlowLayout(spacing: 6) {
                        ForEach(reserved, id: \.self) { tid in
                            if let team = teamMap[tid] {
                                HStack(spacing: 4) {
                                    Text(team.label)
                                        .font(Theme.sans(12))
                                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                                    Button(action: { removeTeam(slotId: slot.id, teamId: tid) }) {
                                        Image(systemName: "xmark")
                                            .font(.system(size: 10, weight: .medium))
                                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                                    }
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                                .cornerRadius(4)
                            }
                        }
                    }
                }
            }

            // Add override row
            if reserved.count < slot.maxTeams && !avail.isEmpty {
                HStack(spacing: 8) {
                    Picker("Add team override…", selection: Binding(
                        get: { addOverrideSelections[slot.id] ?? "" },
                        set: { addOverrideSelections[slot.id] = $0 }
                    )) {
                        Text("Add team override…").tag("")
                        ForEach(avail) { team in
                            Text(team.label).tag(team.id)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                    .cornerRadius(6)

                    Button(action: {
                        if let tid = addOverrideSelections[slot.id], !tid.isEmpty {
                            addOverrideSelections[slot.id] = ""
                            addTeam(slotId: slot.id, teamId: tid)
                        }
                    }) {
                        Text("Add")
                            .font(Theme.display(12))
                            .tracking(0.5)
                            .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Theme.cfGreen)
                            .cornerRadius(6)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255).opacity(0.5), lineWidth: 1)
        )
    }

    // MARK: - Occupancy Bar

    private func occupancyBar(filled: Int, max: Int) -> some View {
        let pct = max > 0 ? min(Double(filled) / Double(max), 1) : 0
        let color: Color = pct == 1 ? Color(red: 0xef/255, green: 0x44/255, blue: 0x44/255) :
                            pct >= 0.5 ? Color(red: 0xf5/255, green: 0x9e/255, blue: 0x0b/255) :
                                         Color(red: 0x22/255, green: 0xc5/255, blue: 0x5e/255)

        return GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                    .frame(height: 2)

                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: geo.size.width * pct, height: 2)
            }
        }
        .frame(height: 2)
    }

    // MARK: - Time Binding

    private func timeBinding(_ timeString: Binding<String>) -> Binding<Date> {
        Binding(
            get: {
                let parts = timeString.wrappedValue.split(separator: ":").compactMap { Int($0) }
                guard parts.count == 2 else { return Date() }
                var components = DateComponents()
                components.hour = parts[0]
                components.minute = parts[1]
                return Calendar.current.date(from: components) ?? Date()
            },
            set: { newDate in
                let formatter = DateFormatter()
                formatter.calendar = Calendar.current
                formatter.locale = Locale(identifier: "en_US_POSIX")
                formatter.dateFormat = "HH:mm"
                timeString.wrappedValue = formatter.string(from: newDate)
            }
        )
    }

    // MARK: - Actions

    private func resetDate() {
        if let firstDate = weekDates.first {
            dateSelection = firstDate
        }
    }

    private func addSlot() {
        let date = Formatting.dateToStr(dateSelection)

        // Guard non-empty
        guard !fieldId.isEmpty, !date.isEmpty, !startTime.isEmpty, !endTime.isEmpty else { return }

        // Time order
        if endTime <= startTime {
            errorMessage = "End time must be after start time."
            return
        }

        // Duplicate check
        if slots.contains(where: { $0.fieldId == fieldId && $0.date == date && $0.startTime == startTime }) {
            errorMessage = "A slot for this field, date, and start time already exists."
            return
        }

        Task {
            do {
                struct CreateBody: Encodable {
                    let fieldId: String
                    let date: String
                    let startTime: String
                    let endTime: String
                    let maxTeams: Int
                }
                let body = CreateBody(
                    fieldId: fieldId,
                    date: date,
                    startTime: startTime,
                    endTime: endTime,
                    maxTeams: maxTeams
                )
                let _: SlotConfig = try await APIClient.shared.adminCreate("slots", body: body)
                await refresh()
                resetDate()
            } catch {
                errorMessage = (error as? APIError)?.message ?? "Something went wrong."
            }
        }
    }

    private func delSlot(id: String) async {
        do {
            try await APIClient.shared.adminDelete("slots", id: id)
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }

    private func updateMax(_ slot: SlotConfig, _ val: Int) {
        let floor = max(1, slot.reservedTeamIds.count)
        let newMax = max(floor, min(8, val))
        if newMax == slot.maxTeams { return }

        Task {
            do {
                struct UpdateBody: Encodable {
                    let id: String
                    let fieldId: String
                    let date: String
                    let startTime: String
                    let endTime: String
                    let maxTeams: Int
                }
                let body = UpdateBody(
                    id: slot.id,
                    fieldId: slot.fieldId,
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    maxTeams: newMax
                )
                let _: SlotConfig = try await APIClient.shared.adminUpdate("slots", body: body)
                await refresh()
            } catch {
                errorMessage = (error as? APIError)?.message ?? "Something went wrong."
            }
        }
    }

    private func removeTeam(slotId: String, teamId: String) {
        Task {
            do {
                let _: SlotConfig = try await APIClient.shared.cancel(slotId: slotId, teamId: teamId)
                await refresh()
            } catch {
                errorMessage = (error as? APIError)?.message ?? "Something went wrong."
            }
        }
    }

    private func addTeam(slotId: String, teamId: String) {
        Task {
            do {
                let _: SlotConfig = try await APIClient.shared.reserve(slotId: slotId, teamId: teamId)
                await refresh()
            } catch {
                errorMessage = (error as? APIError)?.message ?? "Something went wrong."
            }
        }
    }
}

// MARK: - FlowLayout (reuse from TeamSelector.swift)

private struct FlowLayout: Layout {
    var spacing: CGFloat

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
