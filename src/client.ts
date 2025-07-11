import net, { Socket } from 'net'
import { encodeCommand } from '../utilis/commandEncoding.js';
import { tryParse } from '../utilis/parseResponse.js'
import type { ParsingResult } from '../utilis/parseResponse.js';
export type ServerType = 'memo:master' | 'memo:replica'
import { Buffer } from 'buffer'
import { URL } from 'url';


type ConnectinState = "DISCONNECTED" |
  "CONNECTING" |
  "CONNECTED" |
  "CLOSED"
interface ClientConnectionInfo {
  url?: string,
  port?: number,
  host?: string,
}
function processBuffer(buffer: Buffer) {
  let parsingResults: ParsingResult[] = []
  let currentBuffer: Buffer = buffer;
  while (true) {
    if (currentBuffer.length <= 0) {
      break;
    }
    const parsingResult = tryParse(currentBuffer);
    currentBuffer = parsingResult.remainingBuffer;
    parsingResults.push(parsingResult)
    if (parsingResult.error) {
      currentBuffer = Buffer.alloc(0)
      break;
    }
    if (!parsingResult.parsedResponse) {
      break;
    }
  }
  return { remainingBuffer: currentBuffer, parsingResults }
}
export function createClient(clientConnectionInfo?: ClientConnectionInfo) {
  let connectionClient: Socket;
  let connectionState: ConnectinState = 'DISCONNECTED'

  const pendingResolvers: ((data: any) => void)[] = [];

  let buffer: Buffer = Buffer.alloc(0);



  async function sendCommand(args: string[], timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {

      const encodedCommand = encodeCommand(args);

      const timeoutId = setTimeout(() => {
        reject(new Error('Command timeout'))
      }, timeout)

      const wrappedResolve = (data: any) => {
        clearTimeout(timeoutId)
        resolve(data)
      }

      connectionClient.write(encodedCommand);
      pendingResolvers.push(wrappedResolve);
    })
  }

  function set(key: string, value: string) {

    const command = ['SET', key, value]
    return sendCommand(command)
  }
  function get(key: string) {
    const command = ['GET', key]
    return sendCommand(command)
  }
  function del(keys: string[]) {
    const command = ['DEL', ...keys];
    return sendCommand(command)
  }
  function expire(key: string, noSecondsTillExpire: number) {
    const command = ['EXPIRE', key, noSecondsTillExpire.toString()]
    return sendCommand(command)
  }
  function info() {
    const command = ['INFO']
    return sendCommand(command)
  }
  function ping() {
    const command = ['PING']
    return sendCommand(command)
  }
  function connect(): Promise<void> {
    let port = 6379;
    let hostname = 'localhost'
    if (clientConnectionInfo) {
      if (clientConnectionInfo.url) {
        const url = new URL(clientConnectionInfo.url)
        if (url.port)
          port = parseInt(url.port)
        if (url.hostname)
          hostname = url.hostname;
      } else {
        if (clientConnectionInfo.port)
          port = clientConnectionInfo.port;
        if (clientConnectionInfo.host)
          hostname = clientConnectionInfo.host
      }
    }

    connectionClient = net.createConnection({ port, host: hostname });
    return new Promise((resolve, reject) => {
      if (connectionState === "CONNECTED") {
        resolve();
        return;
      }

      connectionState = "CONNECTING";

      connectionClient.on('connect', () => {
        connectionState = "CONNECTED";
        resolve();
      });

      connectionClient.on('data', (data: Buffer) => {
        buffer = Buffer.concat([buffer, data])
        const processBufferResult = processBuffer(buffer);
        buffer = processBufferResult.remainingBuffer;
        for (const parsingResult of processBufferResult.parsingResults) {
          const resolver = pendingResolvers.shift();
          if (resolver) {
            if (typeof parsingResult.parsedResponse === 'string' && parsingResult.parsedResponse.startsWith('ERR')) {
              resolver(Promise.reject(new Error(parsingResult.parsedResponse)));
            } else {
              resolver(parsingResult.parsedResponse);
            }
          }
        }
      });

      connectionClient.on('error', (error) => {
        connectionState = "DISCONNECTED";
        console.error('Connection Error: ', error);
        pendingResolvers.forEach((resolver) => {
          resolver(Promise.reject(error))
        })
        pendingResolvers.length = 0;
      })

      connectionClient.on('close', () => {
        console.log('Connection closed');
      });
    });

  }
  function quit() {
    connectionClient.end()
  }
  function multi() {
    const commandsQueue: string[][] = [];
    const multiApi = {

      set(key: string, value: string) {
        commandsQueue.push(['SET', key, value]);
        return multiApi;
      },
      get(key: string) {
        commandsQueue.push(["GET", key])
        return multiApi
      },
      del(keys: string[]) {
        commandsQueue.push(['DEL', ...keys]);
        return multiApi;
      },
      expire(key: string, noSecondsTillExpire: number) {
        commandsQueue.push(['EXPIRE', key, noSecondsTillExpire.toString()]);
        return multiApi
      },

      info() {
        commandsQueue.push(['INFO'])
        return multiApi;
      },
      ping() {
        commandsQueue.push(['PING'])
        return multiApi
      },
      async exec() {
        sendCommand(['MULTI'])
        for (const command of commandsQueue) {
          await sendCommand(command)
        }
        return sendCommand(['EXEC'])
      },
      discard() {
        sendCommand(['MULTI'])
        return sendCommand(['DISCARD'])
      }
    }
    return multiApi;
  }

  return { connect, quit, set, get, del, expire, info, ping, multi, sendCommand }
}
