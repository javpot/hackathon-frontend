# Launching in Expo Go

## Quick Start

1. **Start the Expo server:**
   ```bash
   npm start
   ```
   Or:
   ```bash
   npx expo start
   ```

2. **Open Expo Go on your device:**
   - **iOS**: Download "Expo Go" from the App Store
   - **Android**: Download "Expo Go" from Google Play Store

3. **Connect to the server:**
   - Scan the QR code displayed in the terminal with:
     - **iOS**: Camera app (it will open Expo Go)
     - **Android**: Expo Go app (tap "Scan QR code")
   - Or manually enter the connection URL shown in the terminal

## Connection Options

When you run `expo start`, you'll see options:
- Press `a` - Open on Android device/emulator
- Press `i` - Open on iOS simulator
- Press `w` - Open in web browser
- Press `r` - Reload app
- Press `m` - Toggle menu
- Press `s` - Switch connection mode (LAN/Tunnel)

## Troubleshooting

### Can't connect from device?

1. **Make sure device and computer are on the same Wi-Fi network**
2. **Try Tunnel mode:**
   - Press `s` in the Expo CLI
   - Select "Tunnel"
   - This uses Expo's servers to route traffic (works even on different networks)

3. **Check firewall:**
   - Make sure your firewall allows connections on ports 19000, 19001, 8081

### App crashes or shows errors?

- Make sure you've removed all incompatible dependencies (already done)
- Check the terminal for error messages
- Try clearing Expo Go cache: Shake device → "Reload"

## Host Server

Don't forget to start the host server for listing sync:

```bash
cd server
npm start
```

The host server runs on port 3001 by default. Make sure it's accessible from your device's network.

## Notes

- The app is now configured for Expo Go (no dev client needed)
- All incompatible native modules have been removed
- The app uses HTTP for communication (Expo Go compatible)
- Map functionality has been replaced with a list view

