# Fix: RCTEventEmitter Module Registration Error

This error occurs when there's a mismatch between native modules and the JavaScript bundle. Here's how to fix it:

## Quick Fix: Clean Build

### 1. Clean Build Folder in Xcode

1. Open Xcode
2. **Product → Clean Build Folder** (or press `Shift + Cmd + K`)
3. Wait for cleanup to complete

### 2. Clean Derived Data

1. **Xcode → Settings → Locations**
2. Click the arrow next to **Derived Data** path
3. Delete the folder for your project (or all derived data)
4. Close Xcode

### 3. Rebuild from Scratch

```bash
# Clean everything
cd ios
rm -rf Pods Podfile.lock build
cd ..

# Reinstall pods
cd ios
pod install
cd ..

# Rebuild
npx expo prebuild --clean --platform ios
```

### 4. Build in Xcode

1. Open `ios/hackatonfrontend.xcworkspace`
2. **Product → Clean Build Folder**
3. **Product → Run** (or build in Release mode)

## Alternative: Disable New Architecture (If Issue Persists)

If the error continues, try temporarily disabling the new architecture:

1. Edit `app.json`
2. Change `"newArchEnabled": true` to `"newArchEnabled": false`
3. Run `npx expo prebuild --clean --platform ios`
4. Rebuild in Xcode

## Why This Happens

This error typically occurs when:
- Build artifacts are stale
- JavaScript bundle wasn't properly generated
- Mismatch between Debug and Release builds
- New architecture compatibility issues

## Most Common Solution

**90% of the time, this fixes it:**
1. Clean Build Folder in Xcode
2. Delete Derived Data
3. Rebuild

Try this first before disabling the new architecture.

