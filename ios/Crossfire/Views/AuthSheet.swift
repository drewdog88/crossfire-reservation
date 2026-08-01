import SwiftUI

struct AuthSheet: View {
    @EnvironmentObject var session: Session
    @Environment(\.dismiss) var dismiss

    enum Mode: String, CaseIterable {
        case signIn = "Sign In"
        case register = "Register"
    }

    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var inFlight = false
    @State private var errorMessage: String?
    @State private var noticeMessage: String?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Logo header (navy strip, matching web loading splash)
                Image("CrossfireLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 40)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(Color(red: 0x0f/255, green: 0x17/255, blue: 0x2a/255))

                // Mode toggle
                Picker("Mode", selection: $mode) {
                    ForEach(Mode.allCases, id: \.self) { m in
                        Text(m.rawValue).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: mode) { _, _ in
                    errorMessage = nil
                    noticeMessage = nil
                }

                ScrollView {
                    VStack(spacing: 16) {
                        // Error banner
                        if let err = errorMessage {
                            HStack {
                                Text(err)
                                    .font(Theme.sans(14))
                                    .foregroundColor(.white)
                                Spacer()
                            }
                            .padding()
                            .background(Color.red)
                            .cornerRadius(8)
                        }

                        // Notice banner
                        if let note = noticeMessage {
                            HStack {
                                Text(note)
                                    .font(Theme.sans(14))
                                    .foregroundColor(.white)
                                Spacer()
                            }
                            .padding()
                            .background(Color.green)
                            .cornerRadius(8)
                        }

                        if mode == .register {
                            TextField("First Name", text: $firstName)
                                .textFieldStyle(.roundedBorder)
                                .autocapitalization(.words)
                                .autocorrectionDisabled()

                            TextField("Last Name", text: $lastName)
                                .textFieldStyle(.roundedBorder)
                                .autocapitalization(.words)
                                .autocorrectionDisabled()
                        }

                        TextField("Email", text: $email, prompt: Text("you@example.com"))
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.emailAddress)

                        SecureField("Password", text: $password)
                            .textFieldStyle(.roundedBorder)

                        if mode == .register {
                            Text("New coach accounts need admin approval before first sign-in. Your teams are assigned by an admin.")
                                .font(Theme.sans(13))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button(action: handleSubmit) {
                            HStack {
                                if inFlight {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .frame(width: 16, height: 16)
                                }
                                Text(buttonLabel)
                                    .font(Theme.sans(16))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.cfGreen)
                            .cornerRadius(8)
                        }
                        .disabled(inFlight)
                    }
                    .padding()
                }
            }
            .navigationTitle(mode.rawValue)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    var buttonLabel: String {
        switch mode {
        case .signIn: return inFlight ? "Signing in…" : "Sign In"
        case .register: return inFlight ? "Creating…" : "Create Account"
        }
    }

    func handleSubmit() {
        errorMessage = nil
        noticeMessage = nil
        inFlight = true

        Task {
            do {
                switch mode {
                case .signIn:
                    try await session.login(email: email, password: password)
                    dismiss()
                case .register:
                    try await session.register(firstName: firstName, lastName: lastName, email: email, password: password)
                    // On success: switch to Sign In, clear password, show green notice
                    mode = .signIn
                    password = ""
                    noticeMessage = "Account created. An admin must approve it before you can sign in."
                }
            } catch let apiError as APIError {
                // Surface APIError.message verbatim
                let msg = apiError.message
                switch mode {
                case .signIn:
                    errorMessage = msg.isEmpty ? "Invalid email or password" : msg
                case .register:
                    errorMessage = msg.isEmpty ? "Could not create account" : msg
                }
            } catch {
                switch mode {
                case .signIn:
                    errorMessage = "Invalid email or password"
                case .register:
                    errorMessage = "Could not create account"
                }
            }
            inFlight = false
        }
    }
}
