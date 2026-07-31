import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject var session: Session
    @EnvironmentObject var weekState: WeekState
    @State private var selectedLocationId = "all"

    let onShowMap: (String) -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                WeekNav()

                LocationFilterChips(
                    locations: session.catalog.locations,
                    selectedId: $selectedLocationId
                )

                ScheduleContent(
                    weekOffset: weekState.offset,
                    selectedLocationId: selectedLocationId,
                    catalog: session.catalog,
                    onShowMap: onShowMap
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .background(Color(red: 0xf8/255, green: 0xfa/255, blue: 0xfc/255))
    }
}

// MARK: - Schedule Content

struct ScheduleContent: View {
    let weekOffset: Int
    let selectedLocationId: String
    let catalog: Catalog
    let onShowMap: (String) -> Void

    private var weekDates: [Date] { Formatting.weekDates(offset: weekOffset) }
    private var weekDateSet: Set<String> { Set(weekDates.map { Formatting.dateToStr($0) }) }
    private var fieldMap: [String: Field] { Dictionary(uniqueKeysWithValues: catalog.fields.map { ($0.id, $0) }) }
    private var locationMap: [String: Location] { Dictionary(uniqueKeysWithValues: catalog.locations.map { ($0.id, $0) }) }
    private var teamsById: [String: Team] { Dictionary(uniqueKeysWithValues: catalog.teams.map { ($0.id, $0) }) }

    private var weekSlots: [SlotConfig] {
        catalog.slots
            .filter { slot in
                weekDateSet.contains(slot.date) &&
                fieldMap[slot.fieldId] != nil &&
                (selectedLocationId == "all" || fieldMap[slot.fieldId]?.locationId == selectedLocationId)
            }
            .sorted(by: compareSlots(fieldMap: fieldMap))
    }

    private var sortedEntries: [(key: String, value: [SlotConfig])] {
        let byDate = Dictionary(grouping: weekSlots, by: { $0.date })
        return byDate.sorted(by: { $0.key < $1.key })
    }

    var body: some View {
        VStack(spacing: 16) {
            if sortedEntries.isEmpty {
                EmptyState(
                    icon: "📋",
                    message: "No fields scheduled for this week. Try a different week or location."
                )
                .padding(.top, 32)
            } else {
                ForEach(sortedEntries.indices, id: \.self) { idx in
                    DaySection(
                        dateStr: sortedEntries[idx].key,
                        dateSlots: sortedEntries[idx].value,
                        fieldMap: fieldMap,
                        locationMap: locationMap,
                        teamsById: teamsById,
                        onShowMap: onShowMap
                    )
                }
            }
        }
    }

    func compareSlots(fieldMap: [String: Field]) -> (SlotConfig, SlotConfig) -> Bool {
        return { a, b in
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
    }
}

// MARK: - Day Section

struct DaySection: View {
    let dateStr: String
    let dateSlots: [SlotConfig]
    let fieldMap: [String: Field]
    let locationMap: [String: Location]
    let teamsById: [String: Team]
    let onShowMap: (String) -> Void

    var body: some View {
        VStack(spacing: 16) {
            DayHeader(dateStr: dateStr)

            ForEach(dateSlots, id: \.id) { slot in
                if let field = fieldMap[slot.fieldId] {
                    FieldPitchView(
                        slot: slot,
                        field: field,
                        location: locationMap[field.locationId],
                        teamsById: teamsById,
                        mode: .view,
                        myTeamId: nil,
                        dayBooked: false,
                        onReserve: nil,
                        onCancel: nil,
                        onShowMap: onShowMap
                    )
                }
            }
        }
    }
}

// MARK: - Supporting Views

struct LocationFilterChips: View {
    let locations: [Location]
    @Binding var selectedId: String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                LocationChip(
                    label: "All fields",
                    isActive: selectedId == "all",
                    onTap: { selectedId = "all" }
                )

                ForEach(locations) { location in
                    LocationChip(
                        label: location.name,
                        isActive: selectedId == location.id,
                        onTap: { selectedId = location.id }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.white)
        .overlay(
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(height: 1),
            alignment: .bottom
        )
    }
}

struct LocationChip: View {
    let label: String
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(label)
                .font(Theme.display(14))
                .foregroundColor(isActive ? Color(red: 0xff/255, green: 0xff/255, blue: 0xff/255) : Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isActive ? Theme.cfGreen : Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                .cornerRadius(8)
        }
    }
}

struct DayHeader: View {
    let dateStr: String

    var body: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                .frame(height: 1)

            Text(Formatting.formatDayHeader(dateStr))
                .font(Theme.display(10))
                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                .textCase(.uppercase)
                .tracking(1.5)

            Rectangle()
                .fill(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                .frame(height: 1)
        }
        .padding(.top, 16)
        .padding(.bottom, 4)
    }
}

struct EmptyState: View {
    let icon: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Text(icon)
                .font(.system(size: 36))

            Text(message)
                .font(Theme.sans(14))
                .foregroundColor(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(.vertical, 64)
    }
}
