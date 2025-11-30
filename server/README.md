# Survia Host Server

Standalone Node.js server that acts as the host for the Survia app, handling listing sync and active user tracking.

## Features

- ✅ HTTP API (Expo Go compatible)
- ✅ Keep-alive tracking for active users
- ✅ Listing CRUD operations (Create, Read, Delete)
- ✅ CORS enabled for cross-origin requests
- ✅ In-memory storage (listings and active users)
- ✅ Automatic cleanup of inactive users

## Installation

```bash
cd server
npm install
```

## Running

```bash
npm start
```

Or with custom port/host:

```bash
PORT=3001 HOST=0.0.0.0 node index.js
```

The server will start on `http://0.0.0.0:3001` by default.

## API Endpoints

### Health Check
```
GET /hello
```
Returns: `"hello"`

### Keep-Alive
```
POST /keepalive
Body: { "deviceId": "client-123", "vendorID": "client-123" }
```
Registers/updates an active user. Returns active user count.

### Get Active Users
```
GET /active-users
```
Returns: `{ "activeUsers": 5 }`

### Get All Listings
```
GET /listings
```
Returns: Array of all listings

### Add Listing
```
POST /listing
Body: { "vendorID": "client-123", "vendorName": "...", "description": "...", ... }
```
Adds a listing to the server store.

### Delete Listing
```
DELETE /listing/:id
```
Deletes a listing by vendorID, serverId, or clientId.

### Server Status
```
GET /status
```
Returns server information (uptime, active users, total listings, etc.)

## Configuration

- **Port**: Set via `PORT` environment variable (default: 3001)
- **Host**: Set via `HOST` environment variable (default: 0.0.0.0)
- **Keep-Alive Timeout**: 30 seconds (hardcoded)

## Notes

- All data is stored in-memory (lost on server restart)
- The server automatically cleans up inactive users after 30 seconds
- Supports large payloads (up to 10MB) for listing images

