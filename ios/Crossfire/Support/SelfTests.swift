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
    // TeamSelector cascade (task 1.3)
    // Fixture: collision pair (B14-D), unique with coach (G15-A), unique without coach (B12-C)
    let t1 = Team(id: "1", gender: "Boys", birthYear: 2014, level: "D", coachName: nil)
    let t2 = Team(id: "2", gender: "Boys", birthYear: 2014, level: "D", coachName: "Smith")
    let t3 = Team(id: "3", gender: "Girls", birthYear: 2015, level: "A", coachName: "Jones")
    let t4 = Team(id: "4", gender: "Boys", birthYear: 2012, level: "C", coachName: nil)
    let teams = [t1, t2, t3, t4]
    // disambiguatedLabel: collision + non-nil coachName → append " · coachName"
    assert(TeamSelectorHelpers.disambiguatedLabel(t2, in: teams) == "B14-D · Smith")
    // collision + nil coachName → plain label
    assert(TeamSelectorHelpers.disambiguatedLabel(t1, in: teams) == "B14-D")
    // NO collision + coachName → plain label (t3 is unique G15-A)
    assert(TeamSelectorHelpers.disambiguatedLabel(t3, in: teams) == "G15-A")
    // NO collision + nil coachName → plain label (t4 is unique B12-C)
    assert(TeamSelectorHelpers.disambiguatedLabel(t4, in: teams) == "B12-C")
    // useCascade: >6 → true, ≤6 → false
    assert(TeamSelectorHelpers.useCascade(teams.count) == false) // 4
    assert(TeamSelectorHelpers.useCascade(6) == false)
    assert(TeamSelectorHelpers.useCascade(7) == true)
    // gendersPresent: stable Boys→Girls order, only those present
    let boysOnly = [t1]
    let girlsOnly = [t3]
    let mixed = teams
    assert(TeamSelectorHelpers.gendersPresent(in: boysOnly) == ["Boys"])
    assert(TeamSelectorHelpers.gendersPresent(in: girlsOnly) == ["Girls"])
    assert(TeamSelectorHelpers.gendersPresent(in: mixed) == ["Boys", "Girls"])
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
