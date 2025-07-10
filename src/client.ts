import net, { Socket } from 'net'
import { encodeCommand } from '../utilis/commandEncoding.js';
export type ServerType = 'memo:master' | 'memo:replica'
function processBuffer(buffer: Buffer) {
  while (true) {
    //TODO
  }
}
export function createClient(servertype?: ServerType) {
  let connectionClient: Socket;
  if (!servertype || servertype === 'memo:master')
    connectionClient = net.createConnection({ port: 6379 });
  else
    connectionClient = net.createConnection({ port: 6380 });

  const pendingResolvers: ((data: string) => void)[] = [];

  let buffer = Buffer.alloc(0);
  connectionClient.on('data', (data) => {
    buffer = Buffer.concat([buffer, data])
    const res = data.toString().trim();
    const resolver = pendingResolvers.shift();
    if (resolver) {
      resolver(res);
    }
  });
  async function sendCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const encodedCommand = encodeCommand(args);
      connectionClient.write(encodedCommand);
      pendingResolvers.push(resolve);
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
  function multi() {
    const commandsQueue: string[][] = [];
    commandsQueue.push(['MULTI'])
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
        for (const command of commandsQueue) {
          await sendCommand(command)
        }
        return sendCommand(['EXEC'])
      },
      discard() {
        return sendCommand(['DISCARD'])
      }
    }
    return multiApi;
  }

  return { set, get, del, expire, info, ping, multi, sendCommand }
}

