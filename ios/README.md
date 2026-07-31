# Crossfire iOS

```bash
cd ios && xcodegen generate
xcodebuild -scheme Crossfire -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
xcrun simctl boot "iPhone 17 Pro"; open -a Simulator
# install path is printed by the build under DerivedData/.../Crossfire.app
xcrun simctl install booted <path>/Crossfire.app
xcrun simctl launch booted com.crossfireselect.fieldmanager
```
Override API base: set `CROSSFIRE_API_BASE` in the Run scheme.

## DEBUG launch hooks (dev convenience, DEBUG builds only)

Pass these to the app process via the `SIMCTL_CHILD_` prefix so you don't have to
sign in / navigate by hand. They are read only under `#if DEBUG` and never
committed with credentials — you supply the values at launch:

```bash
SIMCTL_CHILD_CROSSFIRE_AUTO_EMAIL=you@example.com \
SIMCTL_CHILD_CROSSFIRE_AUTO_PASSWORD='yourpassword' \
SIMCTL_CHILD_CROSSFIRE_WEEK_OFFSET=-53 \
SIMCTL_CHILD_CROSSFIRE_START_TAB=0 \
xcrun simctl launch booted com.crossfireselect.fieldmanager
```

- `CROSSFIRE_AUTO_EMAIL` + `CROSSFIRE_AUTO_PASSWORD` — auto-login on launch (skipped if already authed).
- `CROSSFIRE_WEEK_OFFSET` — start on a specific week (0 = this week, negative = past). Prod data currently lives ~a year back.
- `CROSSFIRE_START_TAB` — start tab index (0 Schedule … 4 Admin).

Note: `simctl launch KEY=VALUE …` sets **argv**, not env — env vars MUST use the
`SIMCTL_CHILD_` prefix.
