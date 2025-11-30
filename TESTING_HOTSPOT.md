# Testing Hotspot Functionality

This guide explains how to test your app's hotspot server functionality on iOS devices.

## Important: Metro Errors vs Your TCP Server

**The Metro connection errors (`localhost:19000/19001`) are SEPARATE from your TCP server.**

- ❌ **Metro errors**: Dev tooling trying to reach Metro bundler (doesn't affect your server)
- ✅ **Your TCP server**: Runs on port 3001, independent of Metro

**You can test your hotspot server even with Metro errors showing in logs.**

## Testing Setup

### Prerequisites

1. **Two iOS devices** (or one iOS + one Android/emulator)
2. **Both devices have the app installed** (via Xcode or EAS build)
3. **Host device** can enable Personal Hotspot

### Step-by-Step Testing

#### 1. On Host Device (iPhone that will serve)

1. **Enable Personal Hotspot:**
   - Settings → Personal Hotspot
   - Turn on "Allow Others to Join"
   - Note the Wi-Fi password

2. **Open the app:**
   - Launch your app (via Xcode or installed build)
   - Go to Connection Mode screen

3. **Start the server:**
   - Tap "Démarrer l'hôte" (Start Host)
   - Wait for "Serveur actif" (Server Active) message
   - Note the IP shown (usually `172.20.10.1` for iOS)

4. **Verify server is running:**
   - Check the console logs for: `[Server] ✅ Server listening on 0.0.0.0:3001`
   - The app should show "Serveur actif" badge

#### 2. On Client Device (iPhone that will connect)

1. **Connect to host's hotspot:**
   - Settings → Wi-Fi
   - Find the host device's hotspot network
   - Enter the password and connect
   - Wait for connection (checkmark appears)

2. **Open the app:**
   - Launch your app
   - Go to Connection Mode screen

3. **Connect to host:**
   - Option A: Tap "Découvrir l'hôte" (Discover Host) - auto-discovers
   - Option B: Manually enter IP `172.20.10.1` in the "Adresse IP de l'hôte" field
   - Tap "Se connecter en tant que client" (Connect as Client)

4. **Verify connection:**
   - Should show "Connecté à l'hôte" (Connected to Host)
   - Navigate to home screen
   - Check if listings sync (if host has listings)

## Troubleshooting Hotspot Connection

### Issue: "No Host Found" or Connection Fails

**Check 1: Is the server actually running?**
- On host device, verify you see "Serveur actif" badge
- Check console logs for server startup messages

**Check 2: Are devices on the same network?**
- Client must be connected to host's Personal Hotspot
- Not just on the same Wi-Fi - must be connected TO the hotspot

**Check 3: Is the IP correct?**
- iOS hotspot usually uses `172.20.10.1`
- But it can vary - check host device's hotspot settings
- On host: Settings → Personal Hotspot → look for the IP shown there

**Check 4: Firewall/Security**
- iOS may block inbound connections in hotspot mode
- Try testing on regular Wi-Fi first (both devices on same router)
- If regular Wi-Fi works but hotspot doesn't, it's an iOS limitation

**Check 5: Port is correct**
- Server runs on port 3001
- Make sure client is connecting to `172.20.10.1:3001` (or whatever IP)

### Testing on Regular Wi-Fi First

Before testing hotspot, verify it works on regular Wi-Fi:

1. **Both devices connect to same Wi-Fi network** (home router, etc.)
2. **Host device:** Start server, note the device's local IP (Settings → Wi-Fi → tap (i) next to network)
3. **Client device:** Enter that IP manually (e.g., `192.168.1.23:3001`)
4. **If this works**, then try hotspot mode

### iOS Hotspot Limitations

⚠️ **Important:** iOS Personal Hotspot has restrictions:

- **Inbound connections may be blocked** by iOS security
- **NAT/firewall** may prevent clients from reaching the host's server
- **Carrier restrictions** - some carriers block certain ports

**Workarounds:**
- Test on regular Wi-Fi first to verify server works
- If hotspot doesn't work, consider:
  - Using MultipeerConnectivity (iOS-native P2P)
  - Using a relay server (both devices connect to external server)
  - Using WebRTC for P2P connections

## Debugging Tips

### Enable Verbose Logging

Check Xcode console for:
- `[Server] ✅ Server listening on 0.0.0.0:3001` - Server started
- `[Server] 🔌 New connection from...` - Client connected
- `[Hotspot] 🔍 Discovering host IP...` - Client searching
- `[Hotspot] ✅ Found host at...` - Client found server

### Test Server Manually

You can test if the server is reachable using a simple TCP client:

1. **On a computer connected to the same network:**
   ```bash
   # Test if server responds
   telnet 172.20.10.1 3001
   # Or use curl if server supports HTTP
   curl http://172.20.10.1:3001/hello
   ```

2. **If this works**, the server is reachable and the issue is in the app
3. **If this fails**, iOS is blocking inbound connections

### Check Network Info

On host device, you can verify the IP:
- Settings → Personal Hotspot
- The IP shown there is what clients should use
- It's usually `172.20.10.1` but can vary

## Expected Behavior

### When Server Starts (Host)
- ✅ "Serveur actif" badge appears
- ✅ IP address displayed (e.g., "IP du point d'accès iOS : 172.20.10.1")
- ✅ Console shows: `[Server] ✅ Server listening on 0.0.0.0:3001`

### When Client Connects
- ✅ "Connecté à l'hôte" badge appears
- ✅ Listings sync (if host has any)
- ✅ Active user count updates
- ✅ Console shows connection logs

### When Connection Fails
- ❌ Error message appears
- ❌ "Découvrir l'hôte" returns "No Host Found"
- ❌ Manual IP connection times out

## Next Steps if Hotspot Doesn't Work

If hotspot mode is blocked by iOS:

1. **Use regular Wi-Fi** for testing (both devices on same router)
2. **Consider MultipeerConnectivity** for iOS-native P2P (better support)
3. **Use a relay server** (both devices connect to external server that routes messages)
4. **Use WebRTC** for browser/app P2P connections

The TCP server code itself should work - the limitation is iOS's network security, not your code.

