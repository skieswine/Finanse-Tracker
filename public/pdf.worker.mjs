// pdf.js worker entry. Safari (iOS/macOS) can't `for await` over a
// ReadableStream yet, which pdf.js does — add it before any work starts.
// (Imports are hoisted, but the worker only uses streams once messages arrive.)
import "./pdf.worker.legacy.min.mjs";

if (typeof ReadableStream !== "undefined" && !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
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
