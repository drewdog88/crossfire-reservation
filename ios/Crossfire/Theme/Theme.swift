import SwiftUI
enum Theme {
    static let cfGreen = Color(red: 0x15/255, green: 0x80/255, blue: 0x3d/255)      // #15803d
    static let cfGreenLight = Color(red: 0xbb/255, green: 0xf7/255, blue: 0xd0/255) // #bbf7d0
    static let pageBg = Color(red: 0xee/255, green: 0xf1/255, blue: 0xf6/255)       // #eef1f6
    static let ink = Color(red: 0x1e/255, green: 0x29/255, blue: 0x3b/255)         // #1e293b
    static func display(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy) } // Barlow Condensed stand-in until font bundled
    static func sans(_ size: CGFloat) -> Font { .system(size: size) }
}
