#!/bin/bash
# Fix for RCTEventEmitter error with New Architecture
# Run this before building in Xcode

echo "🧹 Cleaning build artifacts..."
cd ios
rm -rf Pods Podfile.lock build
cd ..

echo "📦 Reinstalling pods with new architecture..."
cd ios
pod install
cd ..

echo "🔨 Prebuilding with clean..."
npx expo prebuild --clean --platform ios

echo "✅ Done! Now build in Xcode with Release configuration."

