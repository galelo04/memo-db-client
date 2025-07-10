import net, { Socket } from 'net'
import { encodeCommand } from '../utilis/commandEncoding.js';
export type ServerType = 'memo:master' | 'memo:replica'
export function createClient(servertype?: ServerType) {
  let connectionClient: Socket;
  if (!servertype || servertype === 'memo:master')
    connectionClient = net.createConnection({ port: 6379 });
  else
    connectionClient = net.createConnection({ port: 6380 });

  const pendingResolvers: ((data: string) => void)[] = [];

  connectionClient.on('data', (data) => {
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

  return { set, get, sendCommand }
}
