/**
 * pdf.js iterates ReadableStreams with `for await`, which Safari (iOS/macOS)
 * does not support yet → "undefined is not a function (near '...t of e...')".
 * Same polyfill as public/pdf.worker.mjs, for the main thread.
 */
export function polyfillReadableStreamIterator(): void {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as ReadableStream & { [Symbol.asyncIterator]?: unknown };
  if (proto[Symbol.asyncIterator]) return;
  proto[Symbol.asyncIterator] = async function* <T>(this: ReadableStream<T>) {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}
