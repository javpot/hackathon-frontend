# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.
## Using Google Maps in this app (React Native)

This project uses `react-native-maps` for native maps. Below are the steps to embed Google Maps and show the user's current location. This requires a native build (Expo Development Builds or EAS Build) if you want a Google Maps provider.

1) Install dependencies
```bash
# Use the Expo install command so you get compatible versions
expo install react-native-maps expo-location expo-shake
```

2) Add Google Maps API keys
- Generate keys from the Google Cloud Console and enable Maps SDK for Android and Maps SDK for iOS.
- Add the keys to `app.json` (already added placeholders):
   - `expo.ios.config.googleMapsApiKey`
   - `expo.android.config.googleMaps.apiKey`

3) Edit the `plugins` entry in `app.json` (already configured) — we enable the `react-native-maps` plugin with `provider: 'google'`.

4) Run a development build or EAS build (not Expo Go)
 - Development client: `expo prebuild && expo run:android` or `expo run:ios`
 - EAS: `eas build --platform android` and `eas build --platform ios` then install the dev build on your device.

5) Example usage
- A screen example is included at `app/map.tsx` using `react-native-maps` and `expo-location` to request location permission and display a marker at the user's position.

Notes:
- Expo Go does not include native Google Maps modules, so you must use a dev build or build with EAS to test the Google provider.
- For iOS to use Google Maps rather than Apple Maps, use `provider={PROVIDER_GOOGLE}` on `MapView` and add your API key to `Info.plist` via the `expo` config.

Example `app.json` (placeholders are already added to this repo; replace with your own keys):
```json
{
   "expo": {
      "ios": {
         "config": {
            "googleMapsApiKey": "YOUR_IOS_GOOGLE_MAPS_API_KEY"
         }
      },
      "android": {
         "config": {
            "googleMaps": {
               "apiKey": "YOUR_ANDROID_GOOGLE_MAPS_API_KEY"
            }
         }
      }
   }
}
```

Dev tips:
- To test the map on a real device, build a development client or use `eas build`. Runtime provider support (Google maps) is not available with the default Expo Go app.
- For Android emulators, use Google Play image and ensure Google Play Services are available.
- For iOS testing, add the API key and build the app (or use a dev client built with EAS).

Shake-to-alert & manual alerts
- This app includes a global shake listener (powered by `expo-shake`) that opens a modal to select an alert category (Hospital, Food, Water, Shelter, Other). Alerts are stored in a global context and shown on the map.
- Manual alerts: tap the floating + button on the map to create an alert at the current location.
- To test properly, run a dev client or EAS build — the default Expo Go client may intercept shake gestures.

Troubleshooting - "RNMapsAirModule could not be found" and plugin errors

- If you see an error like: `Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found`: this indicates the native module is not present in the binary (you are likely running the app with Expo Go instead of a dev build).
   - Quick fixes:
      - Build a development client with `expo prebuild` + `expo run:android`/`expo run:ios`.
      - Or use EAS to create a dev build: `eas build --platform android --profile development` (then install it).

- If you encounter `PluginError` messages about `react-native-maps`, remove the plugin entry in `app.json` (it's already removed in this repo). The package doesn't export an Expo config plugin to the CLI in a way that would avoid manual prebuild steps; instead rely on `expo prebuild` or `eas build` to configure the native project.

Manual native config pointers:
- Android: Add `<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_ANDROID_GOOGLE_MAPS_API_KEY" />` inside `<application/>` in `android/app/src/main/AndroidManifest.xml` (already added as a placeholder in this repo).
- iOS: Set `ios.config.googleMapsApiKey` in `app.json` or add the key inside `Info.plist`. After `expo prebuild`, the native `Info.plist` should contain the API key.



## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
