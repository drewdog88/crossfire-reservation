import SwiftUI

struct AdminUsersView: View {
    let users: [User]
    let teams: [Team]
    let refresh: () async -> Void

    @State private var editId: String?
    @State private var draftTeamIds: [String] = []
    @State private var busy: Bool = false
    @State private var errorMessage: String?
    @State private var deleteConfirmUserId: String?

    var body: some View {
        VStack(spacing: 16) {
            // Pending Approval section (if any)
            if !pending.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Pending Approval")
                        .font(Theme.display(16))
                        .tracking(0.5)
                        .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))

                    ForEach(pending) { user in
                        UserCard(user: user)
                    }
                }
            }

            // Users section
            VStack(alignment: .leading, spacing: 8) {
                Text("Users")
                    .font(Theme.display(16))
                    .tracking(0.5)
                    .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))

                if active.isEmpty {
                    // Empty state
                    VStack(spacing: 8) {
                        Text("👤")
                            .font(.system(size: 48))
                        Text("No active users yet.")
                            .font(Theme.sans(14))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                } else {
                    ForEach(active) { user in
                        UserCard(user: user)
                    }
                }
            }
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
            "Delete this user?",
            isPresented: .constant(deleteConfirmUserId != nil),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let id = deleteConfirmUserId {
                    deleteConfirmUserId = nil
                    Task { await del(id: id) }
                }
            }
            Button("Cancel", role: .cancel) {
                deleteConfirmUserId = nil
            }
        }
    }

    // MARK: - Computed

    private var teamMap: [String: Team] {
        Dictionary(uniqueKeysWithValues: teams.map { ($0.id, $0) })
    }

    private var pending: [User] {
        users.filter { $0.status == .pending }
    }

    private var active: [User] {
        users.filter { $0.status != .pending }
    }

    // MARK: - UserCard

    @ViewBuilder
    private func UserCard(user: User) -> some View {
        let editing = editId == user.id

        VStack(alignment: .leading, spacing: 0) {
            // Header row
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(user.firstName) \(user.lastName)")
                        .font(Theme.display(16))
                        .tracking(0.5)
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                    Text(user.email)
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                        .lineLimit(1)
                        .truncationMode(.tail)

                    // Chips row
                    FlowLayout(spacing: 6) {
                        if user.status == .pending {
                            chipView(text: "pending", color: .amber)
                        }
                        chipView(text: user.role.rawValue, color: user.role == .admin ? .amber : .navy)
                        ForEach(user.teamIds, id: \.self) { tid in
                            if let team = teamMap[tid] {
                                chipView(text: team.label, color: .green)
                            }
                        }
                    }
                }

                Spacer()

                // Action buttons
                HStack(spacing: 8) {
                    if user.status == .pending {
                        Button(action: { Task { await approve(user) } }) {
                            Text("Approve")
                                .font(Theme.display(14))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Theme.cfGreen)
                                .cornerRadius(6)
                        }
                    } else {
                        Button(action: { startEdit(user) }) {
                            Image(systemName: "pencil")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                .padding(8)
                                .background(Color.clear)
                                .contentShape(Rectangle())
                        }
                    }

                    Button(action: { deleteConfirmUserId = user.id }) {
                        Image(systemName: "trash")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.red)
                            .padding(8)
                            .background(Color.clear)
                            .contentShape(Rectangle())
                    }
                }
            }

            // Edit panel
            if editing {
                VStack(alignment: .leading, spacing: 12) {
                    Divider()
                        .background(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255).opacity(0.5))
                        .padding(.vertical, 8)

                    // Role picker
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Role")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        Picker("Role", selection: Binding(
                            get: { user.role },
                            set: { newRole in
                                Task { await setRole(user, role: newRole) }
                            }
                        )) {
                            Text("Coach").tag(Role.coach)
                            Text("Admin").tag(Role.admin)
                        }
                        .labelsHidden()
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                    }

                    // Assigned Teams
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Assigned Teams")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        FlowLayout(spacing: 6) {
                            ForEach(sortedTeams, id: \.id) { team in
                                Button(action: { toggleTeam(team.id) }) {
                                    let isSelected = draftTeamIds.contains(team.id)
                                    Text(team.label)
                                        .font(Theme.display(12))
                                        .tracking(0.5)
                                        .foregroundColor(isSelected ? Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255) : Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 4)
                                        .background(isSelected ? Theme.cfGreen : Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255))
                                        .cornerRadius(6)
                                }
                            }
                        }
                    }

                    // Action buttons
                    HStack(spacing: 8) {
                        Button(action: { Task { await saveTeams(user) } }) {
                            Text("Save Teams")
                                .font(Theme.display(14))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Theme.cfGreen)
                                .cornerRadius(6)
                        }
                        .disabled(busy)

                        Button(action: { editId = nil }) {
                            Text("Done")
                                .font(Theme.display(14))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        }
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

    // MARK: - Chip View

    private enum ChipColor {
        case amber, navy, green
    }

    private func chipView(text: String, color: ChipColor) -> some View {
        let bgColor: Color
        let textColor: Color

        switch color {
        case .amber:
            bgColor = Color(red: 0xf5/255, green: 0x9e/255, blue: 0x0b/255).opacity(0.15)
            textColor = Color(red: 0xf5/255, green: 0x9e/255, blue: 0x0b/255)
        case .navy:
            bgColor = Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255).opacity(0.3)
            textColor = Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255)
        case .green:
            bgColor = Theme.cfGreen.opacity(0.15)
            textColor = Theme.cfGreen
        }

        return Text(text)
            .font(Theme.display(10))
            .tracking(0.5)
            .foregroundColor(textColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(bgColor)
            .cornerRadius(5)
    }

    // MARK: - Computed (Teams)

    private var sortedTeams: [Team] {
        teams.sorted { $0.label.localizedCaseInsensitiveCompare($1.label) == .orderedAscending }
    }

    // MARK: - Actions

    private func approve(_ user: User) async {
        do {
            struct Body: Encodable {
                let id: String
                let status: String
            }
            let _: User = try await APIClient.shared.adminUpdate("users", body: Body(id: user.id, status: "active"))
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }

    private func setRole(_ user: User, role: Role) async {
        do {
            struct Body: Encodable {
                let id: String
                let role: Role
            }
            let _: User = try await APIClient.shared.adminUpdate("users", body: Body(id: user.id, role: role))
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }

    private func del(id: String) async {
        do {
            try await APIClient.shared.adminDelete("users", id: id)
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }

    private func startEdit(_ user: User) {
        editId = user.id
        draftTeamIds = user.teamIds
    }

    private func toggleTeam(_ id: String) {
        if let index = draftTeamIds.firstIndex(of: id) {
            draftTeamIds.remove(at: index)
        } else {
            draftTeamIds.append(id)
        }
    }

    private func saveTeams(_ user: User) async {
        busy = true
        do {
            struct Body: Encodable {
                let id: String
                let teamIds: [String]
            }
            let _: User = try await APIClient.shared.adminUpdate("users", body: Body(id: user.id, teamIds: draftTeamIds))
            await refresh()
            editId = nil
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
        busy = false
    }
}

// MARK: - FlowLayout

/// Simple wrapping horizontal layout for chips/pills
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.frames[index].minX, y: bounds.minY + result.frames[index].minY), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var frames: [CGRect] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > maxWidth && x > 0 {
                    // Wrap to next line
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }
                frames.append(CGRect(x: x, y: y, width: size.width, height: size.height))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}
