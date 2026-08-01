import SwiftUI

struct AdminLocationsView: View {
    let locations: [Location]
    let refresh: () async -> Void

    @State private var name: String = ""
    @State private var city: String = ""
    @State private var address: String = ""
    @State private var lat: String = ""
    @State private var lon: String = ""
    @State private var editId: String?
    @State private var busy: Bool = false
    @State private var geoBusy: Bool = false
    @State private var geoErr: String?
    @State private var errorMessage: String?
    @State private var deleteConfirmLocationId: String?

    var body: some View {
        VStack(spacing: 16) {
            // Form card
            VStack(alignment: .leading, spacing: 12) {
                Text(editId != nil ? "Edit Location" : "Add Location")
                    .font(Theme.display(16))
                    .tracking(0.5)
                    .foregroundColor(Color(red: 0xe2/255, green: 0xe8/255, blue: 0xf0/255))

                // Name
                VStack(alignment: .leading, spacing: 4) {
                    Text("Name")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    TextField("e.g. 60 Acres", text: $name)
                        .font(Theme.sans(14))
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                }

                // City
                VStack(alignment: .leading, spacing: 4) {
                    Text("City")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    TextField("e.g. Redmond, WA", text: $city)
                        .font(Theme.sans(14))
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                }

                // Address
                VStack(alignment: .leading, spacing: 4) {
                    Text("Address")
                        .font(Theme.sans(12))
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                    TextField("e.g. 17500 NE 76th St, Redmond, WA 98052", text: $address)
                        .font(Theme.sans(14))
                        .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                        .cornerRadius(6)
                }

                // Resolve Location button
                Button(action: geocode) {
                    Text(geoBusy ? "Resolving…" : "Resolve Location")
                        .font(Theme.display(14))
                        .tracking(0.5)
                        .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                }
                .disabled(geoBusy || !canGeocode)

                // Inline geocode error
                if let err = geoErr {
                    Text(err)
                        .font(Theme.sans(12))
                        .foregroundColor(.red)
                }

                // Latitude + Longitude row
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Latitude")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("47.7061", text: $lat)
                            .font(Theme.sans(14))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))
                            .cornerRadius(6)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Longitude")
                            .font(Theme.sans(12))
                            .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))

                        TextField("-122.1394", text: $lon)
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
                        Text(editId != nil ? "Update" : "Add Location")
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

            // Locations list
            VStack(spacing: 8) {
                ForEach(locations) { location in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(location.name)
                                .font(Theme.display(16))
                                .tracking(0.5)
                                .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                            Text((location.city ?? "") + (location.lat != nil && location.lon != nil ? " · 📍 mapped" : ""))
                                .font(Theme.sans(12))
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                        }

                        Spacer()

                        Button(action: { startEdit(location) }) {
                            Image(systemName: "pencil")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(red: 0x94/255, green: 0xa3/255, blue: 0xb8/255))
                                .padding(8)
                                .background(Color.clear)
                                .contentShape(Rectangle())
                        }

                        Button(action: { deleteConfirmLocationId = location.id }) {
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
            "Delete this location? Its fields and slots will be removed.",
            isPresented: .constant(deleteConfirmLocationId != nil),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let id = deleteConfirmLocationId {
                    deleteConfirmLocationId = nil
                    Task { await onDelete(id: id) }
                }
            }
            Button("Cancel", role: .cancel) {
                deleteConfirmLocationId = nil
            }
        }
    }

    // MARK: - Computed

    private var canGeocode: Bool {
        !address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        (!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
         !city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }

    // MARK: - Actions

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        // Parse and validate coordinates
        let trimmedLat = lat.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedLon = lon.trimmingCharacters(in: .whitespacesAndNewlines)

        var latValue: Double? = nil
        if !trimmedLat.isEmpty {
            guard let v = Double(trimmedLat), v.isFinite, v >= -90, v <= 90 else {
                errorMessage = "Latitude must be a number between -90 and 90."
                return
            }
            latValue = v
        }

        var lonValue: Double? = nil
        if !trimmedLon.isEmpty {
            guard let v = Double(trimmedLon), v.isFinite, v >= -180, v <= 180 else {
                errorMessage = "Longitude must be a number between -180 and 180."
                return
            }
            lonValue = v
        }

        busy = true

        Task {
            do {
                let trimmedCity = city.trimmingCharacters(in: .whitespacesAndNewlines)
                let trimmedAddress = address.trimmingCharacters(in: .whitespacesAndNewlines)

                if let id = editId {
                    struct UpdateBody: Encodable {
                        let id: String
                        let name: String
                        let city: String?
                        let address: String?
                        let lat: Double?
                        let lon: Double?
                    }
                    let body = UpdateBody(
                        id: id,
                        name: trimmedName,
                        city: trimmedCity.isEmpty ? nil : trimmedCity,
                        address: trimmedAddress.isEmpty ? nil : trimmedAddress,
                        lat: latValue,
                        lon: lonValue
                    )
                    let _: Location = try await APIClient.shared.adminUpdate("locations", body: body)
                } else {
                    struct CreateBody: Encodable {
                        let name: String
                        let city: String?
                        let address: String?
                        let lat: Double?
                        let lon: Double?
                    }
                    let body = CreateBody(
                        name: trimmedName,
                        city: trimmedCity.isEmpty ? nil : trimmedCity,
                        address: trimmedAddress.isEmpty ? nil : trimmedAddress,
                        lat: latValue,
                        lon: lonValue
                    )
                    let _: Location = try await APIClient.shared.adminCreate("locations", body: body)
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
        name = ""
        city = ""
        address = ""
        lat = ""
        lon = ""
    }

    private func startEdit(_ location: Location) {
        editId = location.id
        name = location.name
        city = location.city ?? ""
        address = location.address ?? ""
        lat = location.lat == nil ? "" : String(location.lat!)
        lon = location.lon == nil ? "" : String(location.lon!)
    }

    private func geocode() {
        guard canGeocode else { return }
        geoBusy = true
        geoErr = nil

        Task {
            do {
                let trimmedAddress = address.trimmingCharacters(in: .whitespacesAndNewlines)
                let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
                let trimmedCity = city.trimmingCharacters(in: .whitespacesAndNewlines)

                let result = try await APIClient.shared.geocodeAddress(
                    address: trimmedAddress.isEmpty ? nil : trimmedAddress,
                    name: trimmedName.isEmpty ? nil : trimmedName,
                    city: trimmedCity.isEmpty ? nil : trimmedCity
                )
                self.lat = String(result.lat)
                self.lon = String(result.lon)
            } catch {
                self.geoErr = (error as? APIError)?.message ?? "Could not resolve. Enter coordinates manually."
            }
            self.geoBusy = false
        }
    }

    private func onDelete(id: String) async {
        do {
            try await APIClient.shared.adminDelete("locations", id: id)
            await refresh()
        } catch {
            errorMessage = (error as? APIError)?.message ?? "Something went wrong."
        }
    }
}
