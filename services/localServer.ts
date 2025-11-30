import TcpSocket from 'react-native-tcp-socket';

const PORT = 3000;
const HOST = '0.0.0.0';

let server: any = null;
let isRunning = false;

/**
 * Start the TCP server
 */
export async function startServer(): Promise<void> {
  if (isRunning) {
    console.log('Server already running');
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      server = TcpSocket.createServer((socket) => {
        socket.on('data', (data: string | Buffer) => {
          const request = data.toString();
          console.log('Received:', request);
          
          // Check if it's a GET request for /hello
          if (request.includes('GET /hello')) {
            const response = 'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nhello';
            socket.write(response);
            console.log('Sent response: hello');
          } else {
            // Default response
            socket.write('OK\r\n');
          }
        });

        socket.on('error', (error: any) => {
          console.error('Socket error:', error);
        });
      });

      server.on('error', (error: any) => {
        console.error('Server error:', error);
        reject(error);
      });

      server.listen(PORT, HOST, () => {
        console.log(`Server listening on ${HOST}:${PORT}`);
        isRunning = true;
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  if (!isRunning || !server) {
    return;
  }

  return new Promise((resolve) => {
    server.close(() => {
      console.log('Server stopped');
      isRunning = false;
      server = null;
      resolve();
    });
  });
}

/**
 * Check if server is running
 */
export function serverIsRunning(): boolean {
  return isRunning;
}
