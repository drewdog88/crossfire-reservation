import Foundation

func runSelfTests() {
    // teamLabel: B/G + 2-digit year + level  (types.ts:56-59)
    assert(Formatting.teamLabel(gender: "Boys", birthYear: 2014, level: "D") == "B14-D")
    assert(Formatting.teamLabel(gender: "Girls", birthYear: 2009, level: "A") == "G09-A")
    // formatTime: 24h -> "h[:mm] am/pm"  (types.ts:62-68)
    assert(Formatting.formatTime("17:30") == "5:30 pm")
    assert(Formatting.formatTime("18:00") == "6 pm")
    assert(Formatting.formatTime("00:00") == "12 am")
    assert(Formatting.timeRangeLabel(start: "16:30", end: "18:00") == "4:30 pm – 6 pm")
    // weekDates: 7 days, Monday-anchored  (types.ts:82-93)
    let wk = Formatting.weekDates(offset: 0)
    assert(wk.count == 7)
    let cal = Calendar(identifier: .gregorian)
    assert(cal.component(.weekday, from: wk[0]) == 2) // Monday
    print("SELFTEST OK")
}
