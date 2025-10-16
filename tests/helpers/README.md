# Test Helpers

This directory contains helper utilities for testing to keep test files clean and maintainable.

## Files

### `http-mocks.ts`
Contains mock implementations for external HTTP endpoints used in testing:

- **httpbin.org mocks**: Comprehensive mocks for HTTP diagnostics testing including:
  - Compression support (gzip, brotli, deflate)
  - Header testing
  - Redirect tracing
  - Cookie handling
  - Timeout simulation
  - Status code testing

- **example.com mocks**: Basic HTML responses for simple HTTP testing

## Usage

These helpers are automatically imported in `tests/setup.ts` and used by the MSW server to intercept external API calls during testing.

## Benefits

1. **CI/CD Reliability**: No external dependencies that could fail or be slow
2. **Deterministic Tests**: Consistent, predictable responses
3. **Fast Execution**: Local mocks are much faster than real HTTP calls
4. **Clean Test Code**: Complex mock logic is extracted from test files
5. **Reusable**: Same mocks can be used across multiple test files

## Maintenance

When adding new external API dependencies to the application:

1. Add corresponding mocks to the appropriate helper file
2. Import and use in `tests/setup.ts`
3. Ensure mocks accurately simulate the real API behavior
4. Add appropriate error suppression patterns in setup.ts if needed