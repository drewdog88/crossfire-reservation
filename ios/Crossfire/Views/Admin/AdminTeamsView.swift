import SwiftUI

struct AdminTeamsView: View {
    let teams: [Team]
    let refresh: () async -> Void

    @State private var gender: String = "Boys"
    @State private var birthYear: Int?
    @State private var level: String = "A"
    @State private var coachName: String = ""
    @State private var editId: String?
    @State private var busy: Bool = false
    @State private var errorMessage: String?
    @State private var deleteConfirmTeamId: String?

    var body: some View {
        VStack(spacing: 16) {
            // Form card
            VStack(alignment: .leading, spacing: 12) {
                Text(editId != nil ? "Edit Team" : "Add Team")
                    .font(Theme.display(16))
                    .tracking(0.5)
                    .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))

                // Gender + Birth Year row
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Gender")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        Picker("Gender", selection: $gender) {
                            Text("Boys").tag("Boys")
                            Text("Girls").tag("Girls")
                        }
                        .labelsHidden()
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Birth Year")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("e.g. 2012", text: Binding(
                            get: { birthYear.map { String($0) } ?? "" },
                            set: { newValue in
                                if newValue.isEmpty {
                                    birthYear = nil
                                } else if let v = Int(newValue) {
                                    birthYear = v
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

                // Level + Coach row
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Level")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("e.g. A, B, 8th Graders", text: $level)
                            .font(Theme.sans(14))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Coach (optional)")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("e.g. Nancy", text: $coachName)
                            .font(Theme.sans(14))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }
                }

                // Buttons
                HStack(spacing: 8) {
                    Button(action: save) {
                        Text(editId != nil ? "Update" : "Add Team")
                            .font(Theme.display(14))
                            .tracking(0.5)
                            .foregroundColor(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Theme.cfGreen)
                            .cornerRadius(6)
                    }
                    .disabled(busy)

                    if editId != nil {
                        Button(action: cancel) {
                            Text("Cancel")
                                .font(Theme.display(14))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        }
                    }
                }
            }
            .padding(16)
            .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
            .cornerRadius(8)

            // Teams list
            VStack(spacing: 8) {
                ForEach(sortedTeams) { team in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(team.label)
                                .font(Theme.display(16))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                            if let coach = team.coachName {
                                Text("Coach \(coach)")
                                    .font(Theme.sans(12))
                                    .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                            }
                        }

                        Spacer()

                        Button(action: { startEdit(team) }) {
                            Image(systemName: "pencil")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                .padding(8)
                                .background(Color.clear)
                                .contentShape(Rectangle())
                        }

                        Button(action: { deleteConfirmTeamId = team.id }) {
                            Image(systemName: "trash")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.red)
                                .padding(8)
                                .background(Color.clear)
                                .contentShape(Rectangle())
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255).opacity(0.5), lineWidth: 1)
                    )
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
            "Delete this team? Its reservations will be removed.",
            isPresented: .constant(deleteConfirmTeamId != nil),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let id = deleteConfirmTeamId {
                    deleteConfirmTeamId = nil
                    Task { await onDelete(id: id) }
                }
            }
            Button("Cancel", role: .cancel) {
                deleteConfirmTeamId = nil
            }
        }
    }

    // MARK: - Computed

    private var sortedTeams: [Team] {
        teams.sorted { $0.label.localizedCaseInsensitiveCompare($1.label) == .orderedAscending }
    }

    // MARK: - Actions

    private func save() {
        guard !gender.isEmpty, let birthYearValue = birthYear, !level.isEmpty else { return }

        busy = true

        Task {
            do {
                let trimmedCoach = coachName.trimmingCharacters(in: .whitespacesAndNewlines)

                if let id = editId {
                    struct UpdateBody: Encodable {
                        let id: String
                        let gender: String
                        let birthYear: Int
                        let level: String
                        let coachName: String?
                    }
                    let body = UpdateBody(
                        id: id,
                        gender: gender,
                        birthYear: birthYearValue,
                        level: level,
                        coachName: trimmedCoach.isEmpty ? nil : trimmedCoach
                    )
                    let _: Team = try await APIClient.shared.adminUpdate("teams", body: body)
                } else {
                    struct CreateBody: Encodable {
                        let gender: String
                        let birthYear: Int
                        let level: String
                        let coachName: String?
                    }
                    let body = CreateBody(
                        gender: gender,
                        birthYear: birthYearValue,
                        level: level,
                        coachName: trimmedCoach.isEmpty ? nil : trimmedCoach
                    )
                    let _: Team = try await APIClient.shared.adminCreate("teams", body: body)
                }

                await refresh()
                self.editId = nil
                self.gender = "Boys"
                self.birthYear = nil
                self.level = "A"
                self.coachName = ""
            } catch {
                self.errorMessage = (error as? APIError)?.message ?? "Something went wrong."
            }
            self.busy = false
        }
    }

    private func cancel() {
        editId = nil
        gender = "Boys"
        birthYear = nil
        level = "A"
        coachName = ""
    }

    private func startEdit(_ team: Team) {
        editId = team.id
        gender = team.gender
        birthYear = team.birthYear
        level = team.level
        coachName = team.coachName ?? ""
    }

    private func onDelete(id: String) async {
        do {
            try await APIClient.shared.adminDelete("teams", id: id)
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }
}
