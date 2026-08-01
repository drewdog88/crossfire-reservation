import SwiftUI

struct AdminFieldsView: View {
    let fields: [Field]
    let locations: [Location]
    let refresh: () async -> Void

    @State private var locationId: String = ""
    @State private var name: String = ""
    @State private var type: Surface = .unknown
    @State private var editId: String?
    @State private var busy: Bool = false
    @State private var errorMessage: String?
    @State private var deleteConfirmFieldId: String?

    var body: some View {
        VStack(spacing: 16) {
            // Form card
            VStack(alignment: .leading, spacing: 12) {
                Text(editId != nil ? "Edit Field" : "Add Field")
                    .font(Theme.display(16))
                    .tracking(0.5)
                    .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))

                // Location
                VStack(alignment: .leading, spacing: 4) {
                    Text("Location")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    Picker("Location", selection: $locationId) {
                        ForEach(locations) { location in
                            Text(location.name).tag(location.id)
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

                // Field Name + Surface row
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Field Name")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("e.g. Field 4", text: $name)
                            .font(Theme.sans(14))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Surface")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        Picker("Surface", selection: $type) {
                            Text("Unknown").tag(Surface.unknown)
                            Text("Turf").tag(Surface.turf)
                            Text("Grass").tag(Surface.grass)
                        }
                        .labelsHidden()
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                    }
                }

                // Buttons
                HStack(spacing: 8) {
                    Button(action: save) {
                        Text(editId != nil ? "Update" : "Add Field")
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

            // Fields list
            VStack(spacing: 8) {
                ForEach(fields) { field in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(field.name)
                                .font(Theme.display(16))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                            HStack(spacing: 4) {
                                Text(locationMap[field.locationId]?.name ?? "")
                                    .font(Theme.sans(12))
                                    .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                                surfaceChip(for: field.type)
                            }
                        }

                        Spacer()

                        Button(action: { startEdit(field) }) {
                            Image(systemName: "pencil")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                .padding(8)
                                .background(Color.clear)
                                .contentShape(Rectangle())
                        }

                        Button(action: { deleteConfirmFieldId = field.id }) {
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
        .onAppear {
            if locationId.isEmpty {
                locationId = locations.first?.id ?? ""
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
            "Delete this field? Its slots will be removed.",
            isPresented: .constant(deleteConfirmFieldId != nil),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let id = deleteConfirmFieldId {
                    deleteConfirmFieldId = nil
                    Task { await onDelete(id: id) }
                }
            }
            Button("Cancel", role: .cancel) {
                deleteConfirmFieldId = nil
            }
        }
    }

    // MARK: - Computed

    private var locationMap: [String: Location] {
        Dictionary(uniqueKeysWithValues: locations.map { ($0.id, $0) })
    }

    // MARK: - Surface Chip

    private func surfaceChip(for surface: Surface) -> some View {
        let (bgColor, textColor, borderColor, label) = surfaceStyle(for: surface)
        return Text(label)
            .font(Theme.display(10))
            .tracking(0.5)
            .foregroundColor(textColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(bgColor)
            .cornerRadius(5)
            .overlay(
                RoundedRectangle(cornerRadius: 5)
                    .stroke(borderColor, lineWidth: 1)
            )
    }

    private func surfaceStyle(for surface: Surface) -> (Color, Color, Color, String) {
        switch surface {
        case .turf:
            return (
                Color.blue.opacity(0.12),
                Color(red: 0x1d/255, green: 0x4e/255, blue: 0xd8/255),
                Color.blue.opacity(0.4),
                "Turf"
            )
        case .grass:
            return (
                Color.green.opacity(0.12),
                Color(red: 0x04/255, green: 0x78/255, blue: 0x57/255),
                Color.green.opacity(0.4),
                "Grass"
            )
        case .unknown:
            return (
                Color.gray.opacity(0.12),
                Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255),
                Color.gray.opacity(0.4),
                "Unknown"
            )
        }
    }

    // MARK: - Actions

    private func save() {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !locationId.isEmpty else { return }

        busy = true

        Task {
            do {
                let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)

                if let id = editId {
                    struct UpdateBody: Encodable {
                        let id: String
                        let locationId: String
                        let name: String
                        let type: Surface
                    }
                    let body = UpdateBody(
                        id: id,
                        locationId: locationId,
                        name: trimmedName,
                        type: type
                    )
                    let _: Field = try await APIClient.shared.adminUpdate("fields", body: body)
                } else {
                    struct CreateBody: Encodable {
                        let locationId: String
                        let name: String
                        let type: Surface
                    }
                    let body = CreateBody(
                        locationId: locationId,
                        name: trimmedName,
                        type: type
                    )
                    let _: Field = try await APIClient.shared.adminCreate("fields", body: body)
                }

                await refresh()
                self.editId = nil
                resetForm()
            } catch {
                self.errorMessage = (error as? APIError)?.message ?? "Something went wrong."
            }
            self.busy = false
        }
    }

    private func cancel() {
        editId = nil
        resetForm()
    }

    private func resetForm() {
        locationId = locations.first?.id ?? ""
        name = ""
        type = .unknown
    }

    private func startEdit(_ field: Field) {
        editId = field.id
        locationId = field.locationId
        name = field.name
        type = field.type
    }

    private func onDelete(id: String) async {
        do {
            try await APIClient.shared.adminDelete("fields", id: id)
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }
}
