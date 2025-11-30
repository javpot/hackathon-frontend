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

## After Prebuild

Once prebuilt, you can:
- Open the project in Xcode anytime
- Make native code changes if needed
- Build and deploy directly from Xcode
- Use Xcode's debugging tools

The `ios/` folder will be generated and can be committed to git if you want to track native changes.

