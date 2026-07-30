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

func runModelSelfTests() {
    let json = """
    {"teams":[{"id":"1","gender":"Boys","birthYear":2014,"level":"D","coachName":null}],
     "locations":[{"id":"2","name":"Grasslawn","city":"Redmond","address":null,"lat":47.6,"lon":-122.1}],
     "fields":[{"id":"3","locationId":"2","name":"Park 1","type":null}],
     "slots":[{"id":"4","fieldId":"3","date":"2026-08-01","startTime":"17:30","endTime":"19:00","maxTeams":4,"reservedTeamIds":["1"]}]}
    """.data(using: .utf8)!
    let c = try! JSONDecoder().decode(Catalog.self, from: json)
    assert(c.teams[0].label == "B14-D")
    assert(c.teams[0].coachName == nil)
    assert(c.fields[0].type == .unknown)       // null -> .unknown, no crash
    assert(c.slots[0].reservedTeamIds == ["1"])
    print("MODEL SELFTEST OK")
}
