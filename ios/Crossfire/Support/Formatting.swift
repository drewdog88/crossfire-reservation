import Foundation

enum Formatting {
    static func teamLabel(gender: String, birthYear: Int, level: String) -> String {
        let yy = String(format: "%02d", birthYear % 100)
        return "\(gender == "Boys" ? "B" : "G")\(yy)-\(level)"
    }

    static func formatTime(_ hhmm: String) -> String {
        let parts = hhmm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 1 else { return hhmm }
        let h = parts[0]
        let m = parts.count > 1 ? parts[1] : 0
        let period = h >= 12 ? "pm" : "am"
        let hour12 = h % 12 == 0 ? 12 : h % 12
        return m == 0 ? "\(hour12) \(period)" : "\(hour12):\(String(format: "%02d", m)) \(period)"
    }

    static func timeRangeLabel(start: String, end: String) -> String {
        "\(formatTime(start)) – \(formatTime(end))"
    }

    private static var cal: Calendar {
        var c = Calendar(identifier: .gregorian); c.firstWeekday = 2; return c
    }

    static func weekDates(offset: Int) -> [Date] {
        let today = Date()
        let dow = cal.component(.weekday, from: today) // 1=Sun..7=Sat
        let deltaToMonday = (dow == 1 ? -6 : 2 - dow)
        let monday = cal.startOfDay(for: cal.date(byAdding: .day, value: deltaToMonday + offset * 7, to: today)!)
        return (0..<7).map { cal.date(byAdding: .day, value: $0, to: monday)! }
    }

    static func dateToStr(_ d: Date) -> String {
        let f = DateFormatter(); f.calendar = cal; f.dateFormat = "yyyy-MM-dd"; return f.string(from: d)
    }

    static func weekRangeLabel(_ dates: [Date]) -> String {
        let f = DateFormatter(); f.dateFormat = "MMM d"
        return "\(f.string(from: dates[0])) – \(f.string(from: dates[6]))"
    }

    static func formatDisplayDate(_ dateStr: String) -> String {
        let inF = DateFormatter(); inF.calendar = cal; inF.dateFormat = "yyyy-MM-dd"
        guard let d = inF.date(from: dateStr) else { return dateStr }
        let outF = DateFormatter(); outF.dateFormat = "EEE, MMM d"
        return outF.string(from: d)
    }

    static func formatDayHeader(_ dateStr: String) -> String {
        let inF = DateFormatter(); inF.calendar = cal; inF.dateFormat = "yyyy-MM-dd"
        guard let d = inF.date(from: dateStr) else { return dateStr }
        let outF = DateFormatter(); outF.dateFormat = "EEEE, MMM d"
        return outF.string(from: d)
    }
}
