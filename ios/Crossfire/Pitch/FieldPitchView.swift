import SwiftUI

enum PitchMode {
    case view, reserve
}

struct FieldPitchView: View {
    let slot: SlotConfig
    let field: Field
    let location: Location?
    let teamsById: [String: Team]
    let mode: PitchMode
    let myTeamId: String?
    let dayBooked: Bool
    let onReserve: (() -> Void)?
    let onCancel: (() -> Void)?
    let onShowMap: ((String) -> Void)?

    var body: some View {
        let filled = slot.reservedTeamIds.count
        let open = max(0, slot.maxTeams - filled)
        let totalH = pitchHeight(maxTeams: slot.maxTeams)
        let narrow = slot.maxTeams > 3
        let (g1, g2) = grassColors(for: field.type)

        let myReservation = myTeamId != nil && slot.reservedTeamIds.contains(myTeamId!)
        let canAct = !myReservation && !dayBooked && open > 0

        let lanes = buildLanes(filled: filled, open: open)

        VStack(spacing: 0) {
            // Header
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(field.name)
                            .font(Theme.display(20))
                            .foregroundColor(Theme.ink)

                        surfaceBadge(for: field.type)
                    }

                    if let location = location {
                        if location.lat != nil && location.lon != nil && onShowMap != nil {
                            Button {
                                onShowMap?(location.id)
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "mappin")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Theme.cfGreen)

                                    Text("\(location.name)\(location.city != nil ? " · \(location.city!)" : "")")
                                        .font(Theme.sans(12))
                                        .foregroundColor(Theme.cfGreen)
                                }
                            }
                        } else {
                            Text("\(location.name)\(location.city != nil ? " · \(location.city!)" : "")")
                                .font(Theme.sans(12))
                                .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))
                        }
                    }

                    Text(Formatting.timeRangeLabel(start: slot.startTime, end: slot.endTime))
                        .font(Theme.display(12))
                        .foregroundColor(Theme.cfGreen)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    openBadge(open: open)
                    Text("\(filled)/\(slot.maxTeams) spots")
                        .font(Theme.display(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    if myReservation {
                        Text("✓ RESERVED")
                            .font(Theme.display(10))
                            .foregroundColor(Theme.cfGreen)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.white)
            .overlay(
                Rectangle()
                    .fill(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                    .frame(height: 1),
                alignment: .bottom
            )

            // Pitch visual
            ZStack(alignment: .leading) {
                // Striped background
                StripedBackground(color1: g1, color2: g2)
                    .frame(height: totalH)

                // Canvas markings
                Canvas { context, size in
                    drawFieldMarkings(context: context, size: size, fieldType: field.type)
                }
                .frame(height: totalH)
                .opacity(field.type == .turf ? 0.06 : 0.065)

                // Goal lines
                Rectangle()
                    .fill(Color.white.opacity(0.28))
                    .frame(width: 1.5)
                    .padding(.vertical, 16)

                HStack(alignment: .center, spacing: 0) {
                    Spacer()
                    Rectangle()
                        .fill(Color.white.opacity(0.28))
                        .frame(width: 1.5)
                        .padding(.vertical, 16)
                }

                // Team columns
                HStack(spacing: 0) {
                    ForEach(Array(lanes.enumerated()), id: \.offset) { index, lane in
                        if index > 0 {
                            DashedDivider()
                        }
                        FieldColumn(
                            team: lane.team,
                            isMyTeam: lane.teamId != nil && myTeamId == lane.teamId,
                            narrow: narrow,
                            mode: mode,
                            canAct: canAct,
                            onAct: lane.team == nil ? onReserve : nil
                        )
                    }
                }
                .frame(height: totalH)
            }
            .frame(height: totalH)

            // Footer (reserve mode only)
            if mode == .reserve {
                footerView(myReservation: myReservation, open: open)
            }
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255), lineWidth: 1)
        )
    }

    // MARK: - Helper Functions

    func pitchHeight(maxTeams: Int) -> CGFloat {
        if maxTeams <= 2 { return 150 }
        if maxTeams <= 4 { return 168 }
        return 184
    }

    func grassColors(for surface: Surface) -> (Color, Color) {
        switch surface {
        case .turf:
            return (Color(red: 0x14/255, green: 0x40/255, blue: 0x2c/255),
                    Color(red: 0x1a/255, green: 0x50/255, blue: 0x37/255))
        case .grass:
            return (Color(red: 0x1a/255, green: 0x52/255, blue: 0x20/255),
                    Color(red: 0x20/255, green: 0x5e/255, blue: 0x27/255))
        case .unknown:
            return (Color(red: 0x1a/255, green: 0x52/255, blue: 0x20/255),
                    Color(red: 0x20/255, green: 0x5e/255, blue: 0x27/255))
        }
    }

    func buildLanes(filled: Int, open: Int) -> [(teamId: String?, team: Team?)] {
        var lanes: [(String?, Team?)] = []
        for teamId in slot.reservedTeamIds {
            lanes.append((teamId, teamsById[teamId]))
        }
        for _ in 0..<open {
            lanes.append((nil, nil))
        }
        return lanes
    }

    func surfaceBadge(for surface: Surface) -> some View {
        let (bgColor, textColor, borderColor, label) = surfaceStyle(for: surface)
        return Text(label)
            .font(Theme.display(10))
            .foregroundColor(textColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(bgColor)
            .overlay(
                RoundedRectangle(cornerRadius: 5)
                    .stroke(borderColor, lineWidth: 1)
            )
            .cornerRadius(5)
    }

    func surfaceStyle(for surface: Surface) -> (Color, Color, Color, String) {
        switch surface {
        case .turf:
            return (
                Color.blue.opacity(0.12),
                Color(red: 0x1d/255, green: 0x4e/255, blue: 0xd8/255),
                Color.blue.opacity(0.4),
                "TURF"
            )
        case .grass:
            return (
                Color.green.opacity(0.12),
                Color(red: 0x04/255, green: 0x78/255, blue: 0x57/255),
                Color.green.opacity(0.4),
                "GRASS"
            )
        case .unknown:
            return (
                Color.gray.opacity(0.12),
                Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255),
                Color.gray.opacity(0.4),
                "UNKNOWN"
            )
        }
    }

    func openBadge(open: Int) -> some View {
        Group {
            if open == 0 {
                Text("FULL")
                    .font(Theme.display(12))
                    .foregroundColor(Color.red)
            } else if open == 1 {
                Text("1 OPEN")
                    .font(Theme.display(12))
                    .foregroundColor(Color.orange)
            } else {
                Text("\(open) OPEN")
                    .font(Theme.display(12))
                    .foregroundColor(Theme.cfGreen)
            }
        }
    }

    func drawFieldMarkings(context: GraphicsContext, size: CGSize, fieldType: Surface) {
        let cy = size.height / 2
        let r = min(size.height * 0.28, 48)

        var path = Path()

        // Halfway line (vertical)
        path.move(to: CGPoint(x: size.width / 2, y: 0))
        path.addLine(to: CGPoint(x: size.width / 2, y: size.height))

        // Center circle
        path.addEllipse(in: CGRect(x: size.width / 2 - r, y: cy - r, width: r * 2, height: r * 2))

        // Center spot
        path.addEllipse(in: CGRect(x: size.width / 2 - 2.5, y: cy - 2.5, width: 5, height: 5))

        // Left penalty arc
        var leftArc = Path()
        leftArc.move(to: CGPoint(x: size.width * 0.14, y: cy - r))
        leftArc.addQuadCurve(
            to: CGPoint(x: size.width * 0.14, y: cy + r),
            control: CGPoint(x: size.width * 0.26, y: cy)
        )

        // Right penalty arc
        var rightArc = Path()
        rightArc.move(to: CGPoint(x: size.width * 0.86, y: cy - r))
        rightArc.addQuadCurve(
            to: CGPoint(x: size.width * 0.86, y: cy + r),
            control: CGPoint(x: size.width * 0.74, y: cy)
        )

        context.stroke(path, with: .color(.white), lineWidth: 1)
        context.stroke(leftArc, with: .color(.white), lineWidth: 1)
        context.stroke(rightArc, with: .color(.white), lineWidth: 1)
    }

    @ViewBuilder
    func footerView(myReservation: Bool, open: Int) -> some View {
        HStack {
            if myReservation {
                if let teamId = myTeamId, let team = teamsById[teamId] {
                    Text("\(team.label) · reserved")
                        .font(Theme.sans(12))
                        .foregroundColor(Theme.cfGreen)
                } else {
                    Text("Reserved")
                        .font(Theme.sans(12))
                        .foregroundColor(Theme.cfGreen)
                }

                Spacer()

                Button {
                    onCancel?()
                } label: {
                    Text("Cancel")
                        .font(Theme.sans(14))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.red)
                        .cornerRadius(6)
                }
            } else if dayBooked {
                Text("Already booked a field on this day")
                    .font(Theme.sans(12))
                    .foregroundColor(Color.orange)
            } else if open == 0 {
                Text("All slots taken for this day")
                    .font(Theme.sans(12))
                    .foregroundColor(Color.red)
            } else {
                Text("Tap an open section to claim your spot")
                    .font(Theme.sans(12))
                    .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x8b/255))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.white)
        .overlay(
            Rectangle()
                .fill(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))
                .frame(height: 1),
            alignment: .top
        )
    }
}

// MARK: - Supporting Views

struct StripedBackground: View {
    let color1: Color
    let color2: Color

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                ForEach(0..<Int(ceil(geometry.size.width / 48)), id: \.self) { i in
                    color1.frame(width: 24)
                    color2.frame(width: 24)
                }
            }
        }
    }
}

struct DashedDivider: View {
    var body: some View {
        GeometryReader { geometry in
            Path { path in
                let dashLength: CGFloat = 16
                let gapLength: CGFloat = 14
                let totalLength = geometry.size.height
                var currentY: CGFloat = 16

                while currentY < totalLength - 16 {
                    path.move(to: CGPoint(x: 1, y: currentY))
                    path.addLine(to: CGPoint(x: 1, y: min(currentY + dashLength, totalLength - 16)))
                    currentY += dashLength + gapLength
                }
            }
            .stroke(Color.white.opacity(0.55), lineWidth: 2)
        }
        .frame(width: 2)
        .padding(.vertical, 16)
    }
}

struct FieldColumn: View {
    let team: Team?
    let isMyTeam: Bool
    let narrow: Bool
    let mode: PitchMode
    let canAct: Bool
    let onAct: (() -> Void)?

    var body: some View {
        let interactive = mode == .reserve && team == nil && canAct

        ZStack {
            if let team = team {
                // Occupied column
                if isMyTeam {
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0x22/255, green: 0xc5/255, blue: 0x5e/255).opacity(0.32),
                            Color(red: 0x22/255, green: 0xc5/255, blue: 0x5e/255).opacity(0.10)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                } else {
                    Color.black.opacity(0.36)
                }

                VStack(spacing: 8) {
                    Text(team.label)
                        .font(Theme.display(narrow ? 16.8 : 21.6))
                        .foregroundColor(isMyTeam ? Theme.cfGreenLight : Color.white.opacity(0.95))
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)

                    if isMyTeam {
                        Text("YOURS")
                            .font(Theme.display(10))
                            .foregroundColor(Theme.cfGreenLight)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Theme.cfGreen.opacity(0.22))
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(Theme.cfGreenLight.opacity(0.5), lineWidth: 1)
                            )
                            .cornerRadius(4)
                    }
                }
                .padding(.horizontal, 8)
                .rotationEffect(narrow ? .degrees(90) : .degrees(0))
            } else {
                // Empty column
                Color.clear

                if interactive {
                    Button {
                        onAct?()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "plus")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white.opacity(0.85))

                            Text("Reserve")
                                .font(Theme.display(13))
                                .foregroundColor(.white.opacity(0.85))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 9)
                                .strokeBorder(
                                    style: StrokeStyle(lineWidth: 1.5, dash: [6, 4])
                                )
                                .foregroundColor(.white.opacity(0.6))
                        )
                    }
                    .rotationEffect(narrow ? .degrees(90) : .degrees(0))
                } else {
                    Text("Available")
                        .font(Theme.display(12))
                        .foregroundColor(.white.opacity(0.72))
                        .rotationEffect(narrow ? .degrees(90) : .degrees(0))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
