import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

process.env.MONGODB_URI = 'mongodb://localhost:27017/cashinsightapp_test';
process.env.JWT_SECRET = 'test-secret-para-tests-cashinsight';

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock;

  window.matchMedia = window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);

  class SVGElementStub extends SVGElement {}
  (SVGElementStub.prototype as unknown as { getBBox: () => unknown }).getBBox =
    () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  (window as unknown as { SVGElement: typeof SVGElementStub }).SVGElement =
    SVGElementStub;
}