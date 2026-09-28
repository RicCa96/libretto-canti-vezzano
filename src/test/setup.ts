import '@testing-library/jest-dom/vitest'

// jsdom does not implement scrollIntoView; stub it so production code that
// calls element.scrollIntoView() does not throw during tests.
window.HTMLElement.prototype.scrollIntoView = function () {}

// Vitest's jsdom environment replaces the global AbortController/AbortSignal
// with jsdom's own implementation, which Node's native Request (used
// internally by undici/fetch) does not recognise as a real AbortSignal. Every
// react-router-dom data-router navigation (including useBlocker's
// blocker.proceed()) builds an internal Request carrying such a signal, so it
// throws under jsdom even though nothing in this app reads request.signal.
// Strip an incompatible signal instead of letting the native brand check
// reject it.
const NativeRequest = globalThis.Request
class TestRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init && 'signal' in init) {
      const rest = { ...init }
      delete rest.signal
      super(input, rest)
    } else {
      super(input, init)
    }
  }
}
globalThis.Request = TestRequest as unknown as typeof Request

