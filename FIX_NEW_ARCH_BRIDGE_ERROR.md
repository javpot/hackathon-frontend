# Fix RCTEventEmitter Error with New Architecture

This error with new architecture enabled is often caused by the JavaScript bundle not being properly generated for Release builds. Here's how to fix it:

## Solution 1: Ensure Bundle is Generated (Most Common Fix)

### Step 1: Build JavaScript Bundle Manually

Before building in Xcode, generate the JavaScript bundle:

```bash
# Generate the bundle for Release
npx expo export --platform ios --output-dir ./dist

# OR if that doesn't work, use Metro directly:
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios
```

### Step 2: Configure Xcode to Use Bundle

1. Open `ios/hackatonfrontend.xcworkspace` in Xcode
2. Select your project → Target `hackatonfrontend`
3. Go to **Build Phases** tab
4. Expand **"Bundle React Native code and images"**
5. Ensure the script includes:
   ```bash
   export NODE_BINARY=node
   ../node_modules/react-native/scripts/react-native-xcode.sh
   ```

### Step 3: Clean and Rebuild

1. **Product → Clean Build Folder** (`Shift + Cmd + K`)
2. Delete Derived Data
3. **Product → Run**

## Solution 2: Check Podfile Configuration

Ensure your `ios/Podfile` has new architecture enabled:

```ruby
# At the top of Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '1'

# Then run
cd ios
pod install
cd ..
```

## Solution 3: Disable React Compiler (Temporary)

The React Compiler might be causing issues with new architecture. Try disabling it:

1. Edit `app.json`
2. Remove or comment out `"reactCompiler": true` in experiments
3. Run `npx expo prebuild --clean --platform ios`
4. Rebuild

## Solution 4: Use EAS Build (Recommended)

EAS Build handles bundle generation automatically:

```bash
# Build with new architecture
eas build --platform ios --profile production --local
```

This ensures the bundle is properly generated with new architecture.

## Solution 5: Check Build Configuration

In Xcode:

1. **Product → Scheme → Edit Scheme**
2. Select **"Run"**
3. **Build Configuration:** Make sure it's **"Release"** for standalone builds
4. **Options tab:** Ensure **"Build Configuration"** is set correctly

## Most Likely Fix

**90% of cases:** The bundle isn't being generated. Try Solution 1 first - manually generate the bundle before building in Xcode.

If that doesn't work, try Solution 4 (EAS Build) as it handles everything automatically.

