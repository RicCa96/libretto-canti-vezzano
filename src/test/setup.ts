import '@testing-library/jest-dom/vitest'

// jsdom does not implement scrollIntoView; stub it so production code that
// calls element.scrollIntoView() does not throw during tests.
window.HTMLElement.prototype.scrollIntoView = function () {}

