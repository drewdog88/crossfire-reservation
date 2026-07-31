import SwiftUI

struct WeekNav: View {
    @EnvironmentObject var weekState: WeekState

    var body: some View {
        let dates = Formatting.weekDates(offset: weekState.offset)

        HStack(spacing: 8) {
            // Previous week button
            Button {
                weekState.offset -= 1
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(Theme.ink.opacity(0.6))
            }
            .padding(6)
            .background(Color.clear)

            // Center: range label + tag
            VStack(spacing: 2) {
                Text(Formatting.weekRangeLabel(dates))
                    .font(Theme.display(16))
                    .foregroundColor(Theme.ink)

                if let tag = weekTag(offset: weekState.offset) {
                    Text(tag)
                        .font(Theme.sans(12))
                        .foregroundColor(tagColor(offset: weekState.offset))
                }
            }
            .frame(maxWidth: .infinity)

            // Next week button
            Button {
                weekState.offset += 1
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(Theme.ink.opacity(0.6))
            }
            .padding(6)
            .background(Color.clear)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(red: 0xf8/255, green: 0xfa/255, blue: 0xfc/255))
        .overlay(
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(height: 1),
            alignment: .bottom
        )
    }

    func weekTag(offset: Int) -> String? {
        switch offset {
        case 0: return "This Week"
        case 1: return "Next Week"
        case ..<0: return "Past"
        default: return nil
        }
    }

    func tagColor(offset: Int) -> Color {
        switch offset {
        case 0: return Theme.cfGreen
        case 1: return Color.orange
        case ..<0: return Color.gray
        default: return Theme.cfGreen
        }
    }
}
