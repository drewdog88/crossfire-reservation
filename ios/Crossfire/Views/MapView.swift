import SwiftUI
import MapKit

struct MapView: View {
    let locations: [Location]
    let fields: [Field]
    let focusLocationId: String?

    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 47.67, longitude: -122.12),
        span: MKCoordinateSpan(latitudeDelta: 0.6, longitudeDelta: 0.6)
    )
    @State private var selectedLocationId: String?
    @State private var lastFocusId: String?

    var body: some View {
        let mapped = locations.filter { $0.lat != nil && $0.lon != nil }
        let unmapped = locations.filter { $0.lat == nil || $0.lon == nil }

        if locations.isEmpty {
            EmptyState(
                icon: "🗺️",
                message: "No locations have been added yet. Admins can create them in the Admin panel."
            )
        } else {
            ZStack(alignment: .topTrailing) {
                Map(coordinateRegion: $region, annotationItems: mapped) { location in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(
                        latitude: location.lat!,
                        longitude: location.lon!
                    )) {
                        Button {
                            selectedLocationId = location.id
                        } label: {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 30))
                                .foregroundColor(.red)
                        }
                    }
                }
                .ignoresSafeArea()
                .onChange(of: focusLocationId) { oldValue, newValue in
                    // Focus-on-arrival: center + zoom + open callout ONCE when focusLocationId changes to a mapped location
                    if let fid = newValue, fid != lastFocusId, let loc = mapped.first(where: { $0.id == fid }) {
                        lastFocusId = fid
                        region = MKCoordinateRegion(
                            center: CLLocationCoordinate2D(latitude: loc.lat!, longitude: loc.lon!),
                            span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
                        )
                        selectedLocationId = loc.id
                    }
                }

                // Callout overlay (shown when a location is selected)
                if let selId = selectedLocationId, let loc = mapped.first(where: { $0.id == selId }) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(loc.name)
                                    .font(Theme.sans(14).weight(.bold))
                                    .foregroundColor(Theme.ink)
                                if let city = loc.city {
                                    Text(city)
                                        .font(Theme.sans(12))
                                        .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x85/255))
                                }
                                Text("\(fieldCount(loc.id)) field(s)")
                                    .font(Theme.sans(12))
                                    .foregroundColor(Color(red: 0x64/255, green: 0x74/255, blue: 0x85/255))
                            }
                            Spacer()
                            Button {
                                selectedLocationId = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.white)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding(.top, 60)
                    .padding(.trailing, 16)
                    .frame(maxWidth: 250)
                }

                // "Not mapped yet" panel (top-trailing, shown only when unmapped.count > 0)
                if !unmapped.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Not mapped yet")
                            .font(Theme.display(12))
                            .foregroundColor(Color(red: 0xf1/255, green: 0xf5/255, blue: 0xf9/255))

                        ForEach(unmapped) { loc in
                            Text(loc.name)
                                .font(Theme.sans(11))
                                .foregroundColor(Color(red: 0xcb/255, green: 0xd5/255, blue: 0xe1/255))
                        }
                    }
                    .padding(12)
                    .background(Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255), lineWidth: 1)
                    )
                    .shadow(radius: 8)
                    .padding(.top, selectedLocationId != nil ? 180 : 60)
                    .padding(.trailing, 12)
                    .frame(maxWidth: 192)
                }
            }
        }
    }

    private func fieldCount(_ locId: String) -> Int {
        fields.filter { $0.locationId == locId }.count
    }
}
