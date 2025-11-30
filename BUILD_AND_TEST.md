# Build and Test on iPhone (Standalone - No Mac Connection After Install)

This guide shows you how to build the app, install it on your iPhone via Xcode, then disconnect and test hotspot functionality completely standalone.

## Prerequisites

- macOS (required for Xcode)
- Xcode installed
- iPhone connected via USB (for initial install)
- Apple Developer Account (free account works)

## Step-by-Step Process

### 1. Prebuild the iOS Project

Generate the native iOS project:

```bash
npx expo prebuild --platform ios
```

This creates the `ios/` folder with the Xcode project.

### 2. Install CocoaPods Dependencies

```bash
cd ios
pod install
cd ..
```

### 3. Open in Xcode

```bash
open ios/hackatonfrontend.xcworkspace
```

**Important:** Open the `.xcworkspace` file, NOT the `.xcodeproj` file.

### 4. Configure Build Settings for Standalone

In Xcode:

1. **Select your project** in the left sidebar (top item)
2. **Select your target** (`hackatonfrontend`)
3. **Go to "Signing & Capabilities" tab**
4. **Select your Team** (your Apple Developer account)
5. **Xcode will automatically create a provisioning profile**

### 5. Select Your iPhone

1. **At the top of Xcode**, next to the play button
2. **Click the device selector** (shows "Any iOS Device" by default)
3. **Select your connected iPhone** from the list

### 6. Build and Install (Release Configuration)

**Option A: Build for Release (Recommended for Testing)**

1. **Product → Scheme → Edit Scheme...**
2. **Select "Run"** in the left sidebar
3. **Build Configuration:** Change from "Debug" to **"Release"**
4. **Click "Close"**
5. **Product → Run** (or press `Cmd + R`)

This builds a **Release** version that:
- ✅ Bundles all JavaScript (no Metro needed)
- ✅ Runs completely standalone
- ✅ No Mac connection required after install

**Option B: Build for Debug (If you need debugging)**

If you want to see console logs later:
1. Keep "Debug" configuration
2. **Product → Run**

Note: Debug builds also bundle JavaScript, so they work standalone too, but are larger.

### 7. Wait for Build and Install

- Xcode will compile the app
- It will install on your iPhone
- The app will launch automatically

### 8. Disconnect iPhone from Mac

Once the app is installed and running on your iPhone:

1. **Unplug the USB cable** from your iPhone
2. **The app continues running** - it's now standalone!

### 9. Test Hotspot Functionality

Now test completely standalone (no Mac connection):

**On Host iPhone:**
1. Open the app
2. Go to Connection Mode
3. Enable iPhone hotspot (Settings → Personal Hotspot)
4. Tap "Start Host"
5. Note the IP address shown (e.g., `172.20.10.1:3001`)

**On Client iPhone (or another device):**
1. Connect to the host's hotspot (Settings → Wi-Fi)
2. Open the app
3. Go to Connection Mode
4. Tap "Discover Host" or manually enter the host IP
5. Tap "Connect to Host"

**Verify:**
- ✅ Server starts on host
- ✅ Client discovers/connects to host
- ✅ Listings sync between devices
- ✅ Everything works without Mac connection

## What Works After Disconnecting

Once installed and disconnected:

✅ **App runs normally** - All features work
✅ **TCP Server** - Runs on port 3001 independently
✅ **Hotspot functionality** - Host/client connections work
✅ **No Metro needed** - JavaScript is bundled in the app
✅ **No Mac needed** - App runs entirely on device
✅ **Works offline** - No internet connection required

## Rebuilding After Code Changes

If you make code changes:

1. **Connect iPhone to Mac** (USB)
2. **In Xcode:** Product → Run (or `Cmd + R`)
3. **Wait for rebuild and install**
4. **Disconnect and test again**

## Troubleshooting

### "No devices found"
- Make sure iPhone is connected via USB
- Unlock your iPhone
- Trust the computer if prompted on iPhone

### "Signing requires a development team"
- Go to Xcode → Preferences → Accounts
- Add your Apple ID
- Select your team in Signing & Capabilities

### "Could not launch app"
- Check iPhone Settings → General → VPN & Device Management
- Trust your developer certificate if needed

### App crashes on launch
- Check Xcode console for errors
- Make sure all dependencies are installed (`pod install`)
- Try cleaning build: Product → Clean Build Folder (`Cmd + Shift + K`)

### Hotspot not working
- Verify hotspot is enabled on host iPhone
- Check that client is connected to hotspot Wi-Fi
- Ensure both devices are using the app (not Expo Go)
- Check server IP shown in Connection Mode matches hotspot gateway

## Summary

**Workflow:**
1. `npx expo prebuild --platform ios`
2. `cd ios && pod install && cd ..`
3. `open ios/hackatonfrontend.xcworkspace`
4. In Xcode: Select iPhone → Product → Scheme → Edit Scheme → Release → Run
5. Wait for install
6. **Disconnect iPhone**
7. **Test hotspot - works standalone!**

The app is now completely standalone and doesn't need your Mac at all.

