import '@testing-library/jest-dom';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// fetch mock
global.fetch = jest.fn();

// next/navigation mock
jest.mock('next/navigation', () => ({
  useRouter:      () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname:    jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));
