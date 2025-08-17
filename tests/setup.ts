// Jest setup file for Obsidian plugin tests

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};