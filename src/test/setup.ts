import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
});

global.cancelAnimationFrame = vi.fn();

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: vi.fn(),
});

// Mock buffered property
Object.defineProperty(HTMLMediaElement.prototype, 'buffered', {
    configurable: true,
    get: vi.fn(() => ({
        length: 1,
        start: () => 0,
        end: () => 10,
    })),
});
