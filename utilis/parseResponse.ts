const supportedTypes = new Set(['*', '%', '$', '_', '-', '+', ':']);
function isSupportedType(type: string) {
  return supportedTypes.has(type)
}
export interface ParsingResult {
  remainingBuffer: Buffer,
  error?: string,
  parsedResponse?: any
}
export function tryParse(buffer: Buffer): ParsingResult {
  let bufferPointer = 1
  let parsedResponse: any
  const firstCharacter = String.fromCharCode(buffer[0]);
  if (!isSupportedType(firstCharacter)) {
    return { remainingBuffer: buffer, error: `unsupported resposne type ${firstCharacter}` }
  }
  let delOffset = buffer.indexOf('\r\n', bufferPointer)
  if (delOffset === -1) {
    return { remainingBuffer: buffer }
  }
  switch (firstCharacter) {
    case '+':
      parsedResponse = buffer.slice(bufferPointer, delOffset).toString()
      return { remainingBuffer: buffer.slice(delOffset + 2), parsedResponse }
    case '_':
      parsedResponse = null
      return { remainingBuffer: buffer.slice(delOffset + 2), parsedResponse }
    case '-':
      parsedResponse = buffer.slice(bufferPointer, delOffset).toString()
      return { remainingBuffer: buffer.slice(delOffset + 2), parsedResponse }
    case ':':
      parsedResponse = Number(buffer.slice(bufferPointer, delOffset))
      return { remainingBuffer: buffer.slice(delOffset + 2), parsedResponse }
    case '$':
      const argLength = Number(buffer.slice(bufferPointer, delOffset))
      if (argLength === -1) {
        return { remainingBuffer: buffer.slice(delOffset + 2), parsedResponse: null }
      }
      bufferPointer = delOffset + 2
      const slice = buffer.slice(bufferPointer, bufferPointer + argLength)
      if (argLength === slice.length) {
        parsedResponse = slice.toString()
        bufferPointer += argLength;
        if (String.fromCharCode(buffer[bufferPointer]) === '\r' && String.fromCharCode(buffer[bufferPointer + 1]) === '\n') {
          bufferPointer += 2;
          return { remainingBuffer: buffer.slice(bufferPointer), parsedResponse: slice.toString() }
        } else {
          return { remainingBuffer: buffer, error: "missing CRLF after bulk string" }
        }
      } else {
        return { remainingBuffer: buffer }
      }
    case '*':
      parsedResponse = []
      const argCount = Number(buffer.slice(bufferPointer, delOffset))
      if (argCount === -1) {

        return { remainingBuffer: buffer.slice(delOffset + 2), parsedResponse: null }
      }
      let auxBuffer = buffer.slice(delOffset + 2)
      for (let i = 0; i < argCount; i++) {
        const parsedArgument = tryParse(auxBuffer);
        if (parsedArgument.error) {
          return { remainingBuffer: buffer, error: parsedArgument.error }
        }
        if (parsedArgument.parsedResponse && !Array.isArray(parsedArgument.parsedResponse))
          parsedResponse.push(parsedArgument.parsedResponse);
        auxBuffer = parsedArgument.remainingBuffer;
      }
      return { remainingBuffer: auxBuffer, parsedResponse }
  }
  return { remainingBuffer: buffer, error: `unsupported resposne type ${firstCharacter}` }
}
