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
