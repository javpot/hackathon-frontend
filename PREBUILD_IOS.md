# Prebuild and Run on iOS Device via Xcode

This guide explains how to prebuild the app and run it on an iOS device through Xcode without using Expo Go.

## Prerequisites

1. **macOS** (required for iOS development)
2. **Xcode** (latest version recommended)
3. **CocoaPods** installed:
   ```bash
   sudo gem install cocoapods
   ```
4. **Node.js** and npm installed
5. **Apple Developer Account** (free account works for development)

## Important: Two Separate Issues

### Issue 1: Metro Connection Errors (Dev Tooling)
The `localhost:19000/19001/8081` connection errors you see are from **Expo Dev Client** trying to reach the **Metro bundler** (which runs on your Mac, not the phone). These are **development-only** errors and don't affect your actual app server.

**Fix:** The `app.json` now includes `packagerOpts: { hostType: "lan" }` which tells Expo to use your Mac's LAN IP instead of localhost. When you run `npx expo start --dev-client`, make sure to:
- Use **LAN** or **Tunnel** mode (press `s` in Expo CLI to switch)
- Ensure iPhone and Mac are on the same Wi-Fi network

### Issue 2: Your Actual TCP Server (App Feature)
Your app's TCP server (using `react-native-tcp-socket` on port 3001) is **completely separate** from Metro. It:
- ✅ Binds to `0.0.0.0` (correct for accepting connections)
- ✅ Uses port 3001 (your custom port, not Metro's ports)
- ✅ Should work fine on iOS after prebuild

The Metro errors **do not indicate** your TCP server won't work. They're just dev tooling issues.

## Steps

### 1. Prebuild the iOS Project

Run the prebuild command to generate the native iOS project:

```bash
npx expo prebuild --platform ios
```

This will create an `ios/` folder with the native Xcode project.

### 2. Install CocoaPods Dependencies

Navigate to the iOS directory and install dependencies:

```bash
cd ios
pod install
cd ..
```

### 3. Open in Xcode

Open the workspace file (not the .xcodeproj file):

```bash
open ios/hackatonfrontend.xcworkspace
```

Or manually:
- Navigate to the `ios/` folder
- Double-click `hackatonfrontend.xcworkspace`

### 4. Configure Signing & Capabilities in Xcode

1. In Xcode, select the project in the Project Navigator (left sidebar)
2. Select the **hackatonfrontend** target
3. Go to the **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (your Apple Developer account)
6. Xcode will automatically generate a provisioning profile

### 5. Connect Your iOS Device

1. Connect your iPhone/iPad to your Mac via USB
2. Trust the computer on your device if prompted
3. In Xcode, select your device from the device dropdown (top toolbar, next to the play button)

### 6. Build and Run

1. Click the **Play** button (▶️) or press `Cmd + R`
2. Xcode will build the app and install it on your device
3. On your device, go to **Settings > General > VPN & Device Management** and trust your developer certificate if needed

## Important Notes

### Native Modules Used

- ✅ **react-native-maps**: Configured with Google Maps API key
- ✅ **expo-location**: Location permissions configured
- ✅ **expo-sqlite**: Works on iOS
- ✅ **expo-image-picker**: Photo permissions configured
- ⚠️ **react-native-wifi-reborn**: **Android only** - WiFi scanning is disabled on iOS (the app shows "Not Supported" message)

### Troubleshooting

#### Build Errors

If you encounter build errors:

1. **Clean build folder**: In Xcode, go to `Product > Clean Build Folder` (Shift + Cmd + K)
2. **Reinstall pods**:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   ```
3. **Clear derived data**: In Xcode, go to `Xcode > Settings > Locations` and click the arrow next to Derived Data, then delete the folder

#### Google Maps Not Showing

- Verify the Google Maps API key is correct in `app.json`
- Ensure the API key has **Maps SDK for iOS** enabled in Google Cloud Console
- After prebuild, check that the key is in `ios/hackatonfrontend/Info.plist`

#### Location Permission Issues

- The location permission description is already configured in `app.json`
- If issues persist, check `ios/hackatonfrontend/Info.plist` after prebuild

#### WiFi Scanning on iOS

- WiFi scanning is **not available on iOS** due to Apple's restrictions
- The app already handles this gracefully by showing "Not Supported" message
- Users can manually connect to WiFi networks through iOS Settings

## Alternative: Using EAS Build

If you prefer cloud builds:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS
eas build --platform ios --profile development
```

Then install the `.ipa` file on your device.

## Running the App After Prebuild

### Development Mode (with Metro)

1. **Start Metro bundler with dev client:**
   ```bash
   npx expo start --dev-client
   ```

2. **In the Expo CLI terminal:**
   - Press `s` to open settings
   - Select **LAN** or **Tunnel** (NOT localhost)
   - This ensures your iPhone can reach Metro on your Mac

3. **On your iPhone:**
   - Open the Expo Dev Client app
   - Scan the QR code or enter the URL manually
   - The app will load from your Mac's Metro server

### Production/Release Mode (No Metro)

For a release build where your TCP server runs independently:

1. **Build a release version:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Or build locally:**
   - In Xcode, change scheme to "Release"
   - Build and run (Cmd + R)
   - Your TCP server will work without Metro

## After Prebuild

Once prebuilt, you can:
- Open the project in Xcode anytime
- Make native code changes if needed
- Build and deploy directly from Xcode
- Use Xcode's debugging tools

The `ios/` folder will be generated and can be committed to git if you want to track native changes.

## Your TCP Server on iOS

Your app's TCP server (`react-native-tcp-socket` on port 3001) should work on iOS because:
- ✅ It binds to `0.0.0.0` (listens on all interfaces)
- ✅ Uses port 3001 (not Metro's ports)
- ✅ `react-native-tcp-socket` supports iOS

**Note:** iOS hotspot mode may have limitations for inbound connections. Test on:
1. Regular Wi-Fi first (both devices on same network)
2. Then test hotspot mode

If hotspot doesn't work, consider using MultipeerConnectivity framework (iOS-native P2P solution).

