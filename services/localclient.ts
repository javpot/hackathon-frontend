import TcpSocket from 'react-native-tcp-socket';
import { DEFAULT_SERVER_PORT } from '../constants/connection';

/**
 * Send a GET request to the local server and receive the response
 */
export async function sendGetRequest(
  path: string = '/hello',
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to connect to ${serverHost}:${serverPort}...`);
    
    let connectionEstablished = false;
    let responseReceived = false;
    let responseData = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const client = TcpSocket.createConnection(
      {
        port: serverPort,
        host: serverHost,
      },
      () => {
        // Connection established
        connectionEstablished = true;
        console.log('✅ Connected to local server');
        
        // Send GET request
        const request = `GET ${path} HTTP/1.1\r\nHost: ${serverHost}:${serverPort}\r\n\r\n`;
        try {
          client.write(request);
          console.log('📤 Sent GET request:', request);
        } catch (writeError: any) {
          console.error('❌ Error writing request:', writeError);
          reject(new Error(`Failed to send request: ${writeError.message || writeError}`));
        }
      }
    );

    client.on('data', (data: string | Buffer) => {
      responseReceived = true;
      responseData += data.toString();
      console.log('📥 Received data:', data.toString());
      
      // Close connection after receiving response
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      client.destroy();
    });

    client.on('error', (error: any) => {
      console.error('❌ Client socket error:', error);
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || String(error);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Provide more specific error messages
      let userMessage = `Connection error: ${errorMessage}`;
      if (errorCode === 'ECONNREFUSED') {
        userMessage = `Connection refused. Is the server running on ${serverHost}:${serverPort}?`;
      } else if (errorCode === 'ENOTFOUND' || errorCode === 'EADDRNOTAVAIL') {
        userMessage = `Cannot resolve host ${serverHost}. Check your network configuration.`;
      } else if (errorCode === 'ETIMEDOUT') {
        userMessage = `Connection timeout. Server may not be responding.`;
      }
      
      reject(new Error(userMessage));
    });

    client.on('close', () => {
      console.log('🔌 Connection closed');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (responseReceived && responseData) {
        resolve(responseData.trim());
      } else if (!connectionEstablished) {
        reject(new Error('Connection failed: Could not establish connection to server'));
      } else if (!responseReceived) {
        reject(new Error('No response received from server'));
      } else {
        resolve(responseData.trim() || 'Empty response');
      }
    });

    // Timeout after 5 seconds
    timeoutId = setTimeout(() => {
      if (client && !client.destroyed) {
        console.error('⏱️ Request timeout after 5 seconds');
        client.destroy();
        reject(new Error('Request timeout: Server did not respond within 5 seconds'));
      }
    }, 5000);
  });
}

/**
 * Simple function to test the server connection
 */
export async function testServerConnection(
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<string> {
  try {
    const response = await sendGetRequest('/hello', serverHost, serverPort);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to connect to server: ${error.message}`);
  }
}

