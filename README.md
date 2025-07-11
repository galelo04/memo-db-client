
A TypeScript client for connecting to memo-db, a Redis-compatible mini clone database.

## Installation

```bash
npm install memo-db-client
```

## Quick Start

```typescript
import { createClient } from 'memo-db-client';

// Create a client instance
const client = createClient(); //port:6379   host:'localhost'

// Connect to the database
client.connect();

// Basic operations
async function example() {
  // Set a key-value pair
  await client.set('mykey', 'myvalue');
  
  // Get a value
  const value = await client.get('mykey');
  console.log(value); // 'myvalue'
  
  // Delete keys
  await client.del(['mykey']);
  
  // Set expiration (in seconds)
  await client.set('tempkey', 'tempvalue');
  await client.expire('tempkey', 60); // expires in 60 seconds
  
  // Check server info
  const info = await client.info();
  console.log(info);
  
  // Ping the server
  const pong = await client.ping();
  console.log(pong); // 'PONG'
  
  // Close the connection
  client.quit();
}

example().catch(console.error);
```

## Connection Options


### Default Connection

```typescript
const client = createClient();
//host: 'localhost'
//port:6379
```
### Using host and port

```typescript
const client = createClient({
  host: 'localhost',
  port: 6379
});
```

### Using URL

```typescript
const client = createClient({
  url: 'memo://localhost:6379'
});
```

## API Reference

### Connection Management

#### `connect()`
Establishes a connection to the memo-db server.

#### `quit()`
Closes the connection to the server.

### Basic Commands

#### `set(key: string, value: string): Promise<any>`
Sets a key-value pair in the database.

```typescript
await client.set('username', 'john_doe');
```

#### `get(key: string): Promise<string | null>`
Retrieves the value associated with a key.

```typescript
const value = await client.get('username');
```

#### `del(keys: string[]): Promise<number>`
Deletes one or more keys from the database.

```typescript
await client.del(['key1', 'key2', 'key3']);
```

#### `expire(key: string, seconds: number): Promise<number>`
Sets an expiration time for a key (in seconds).

```typescript
await client.expire('session_token', 3600); // expires in 1 hour
```

### Server Commands

#### `info(): Promise<string>`
Returns information about the server.

#### `ping(): Promise<string>`
Pings the server. Returns 'PONG' if successful.

### Transactions

memo-db-client supports Redis-style transactions using `MULTI`/`EXEC` commands:

```typescript
const result = await client.multi()
  .set('key1', 'value1')
  .set('key2', 'value2')
  .get('key1')
  .del(['key2'])
  .exec();

console.log(result); // Array of results for each command
```

#### Transaction Methods

- `multi()`: Start a transaction
- `exec()`: Execute all queued commands
- `discard()`: Discard all queued commands

All basic commands (`set`, `get`, `del`, `expire`, `info`, `ping`) are available in transaction mode.

## Error Handling

The client automatically handles server errors and rejects promises with appropriate error messages:

```typescript
try {
  await client.get('nonexistent_key');
} catch (error) {
  console.error('Error:', error.message);
}
```

## Advanced Usage

### Custom Commands

For commands not directly supported by the client methods, you can use the `sendCommand` method:

```typescript
const result = await client.sendCommand(['CUSTOM_COMMAND', 'arg1', 'arg2']);
```

### Connection Events

The underlying socket connection can be accessed if needed for advanced use cases, though this is not recommended for typical usage.

## TypeScript Support

This package is written in TypeScript and includes full type definitions. No additional `@types` package is needed.

## Compatibility

This client is designed to work with memo-db servers that support the Redis protocol subset. It supports:

- Basic key-value operations (GET, SET, DEL)
- Key expiration (EXPIRE)
- Server information (INFO, PING)
- Transactions (MULTI, EXEC, DISCARD)

## License

MIT

## Contributing

Issues and pull requests are welcome. Please ensure all tests pass and follow the existing code style.

## Changelog

### v1.0.0
- Initial release
- Support for basic Redis commands
- Transaction support
- TypeScript definitions included memo-db-client

