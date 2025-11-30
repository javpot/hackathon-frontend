# Ngrok Setup Instructions

## Quick Setup

1. **Get your ngrok URL:**
   ```bash
   ngrok http 3001
   ```
   Copy the "Forwarding" URL (e.g., `https://abc123.ngrok-free.app`)

2. **Update the app:**
   - Open `constants/connection.ts`
   - Replace `YOUR-NGROK-URL` in `NGROK_HOST_URL` with your actual ngrok URL:
   ```typescript
   export const NGROK_HOST_URL = 'https://abc123.ngrok-free.app'; // Your actual URL
   ```

3. **Start the host server:**
   ```bash
   cd server
   npm start
   ```

4. **Start ngrok (if not already running):**
   ```bash
   ngrok http 3001
   ```

## Important Notes

- **Ngrok URL changes**: Free ngrok URLs change every time you restart ngrok. You'll need to update `NGROK_HOST_URL` each time.
- **Ngrok authentication**: You need to sign up at https://dashboard.ngrok.com and install your authtoken:
  ```bash
  ngrok config add-authtoken YOUR_AUTH_TOKEN
  ```
- **Temporary solution**: This is a temporary hardcoded solution. The app will use the ngrok URL for all server requests.

## Testing

1. Make sure the host server is running on port 3001
2. Make sure ngrok is forwarding port 3001
3. Update `NGROK_HOST_URL` in `constants/connection.ts`
4. Restart the Expo app
5. The app should now connect to your host server via ngrok

