# Testing Guide

The app uses a comprehensive testing strategy with unit tests (Vitest) and end-to-end tests (Playwright) to ensure reliability across its 100+ networking tools.

## Test Architecture

### Unit Tests (Vitest)

Unit tests are located in `tests/unit/` and cover:
- **Utils** - Business logic and calculations
- **Content** - Educational content and reference data
- **Routes** - API endpoints and page logic
- **Components** - Svelte component behaviour

### E2E Tests (Playwright)

End-to-end tests in `tests/e2e/` verify:
- **Page Coverage** - All tools load without console errors
- **Critical Flows** - Key user journeys work correctly
- **Calculations** - Tool functionality across browsers

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Interactive mode with UI
npm run test:ui

# Watch mode (development)
npm run test -- --watch
```

### E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test page-coverage.spec.ts
```

## Unit Test Configuration

Tests are configured via [`vitest.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/vitest.config.ts):

```typescript
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      thresholds: {
        global: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85
        }
      }
    }
  }
});
```

### Coverage Requirements

The project maintains strict coverage requirements:
- **85% minimum** across all metrics (statements, branches, functions, lines)
- **Automatic failure** if coverage drops below threshold
- **Excluded files** - Test files, Svelte components, and configuration files

## E2E Test Configuration

Playwright tests are configured via [`playwright.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/playwright.config.ts):

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
  }
});
```

### Browser Support

Tests run across multiple browsers:
- **Chrome** - Primary development browser
- **Firefox** - Cross-browser compatibility
- **Safari** - Disabled due to CI limitations (WebKit dependencies)

## Test Categories

### Utils Tests

Located in `tests/unit/utils/`, these test core business logic:

```typescript
// Example: CIDR split functionality
describe('CIDR Split', () => {
  test('should split /24 into /25 subnets', () => {
    const result = cidrSplit('192.168.1.0/24', 25);
    expect(result).toEqual([
      '192.168.1.0/25',
      '192.168.1.128/25'
    ]);
  });
});
```

### Content Tests

Tests in `tests/unit/content/` verify educational content:

```typescript
// Example: Reference content validation
describe('CIDR Content', () => {
  test('should contain valid CIDR examples', () => {
    const examples = getCidrExamples();
    examples.forEach(example => {
      expect(isValidCidr(example.cidr)).toBe(true);
    });
  });
});
```

### Route Tests

API endpoint tests in `tests/unit/routes/`:

```typescript
// Example: API endpoint testing
describe('/api/internal/diagnostics/dns', () => {
  test('should return valid DNS lookup results', async () => {
    const response = await GET(new Request('/api/internal/diagnostics/dns?domain=example.com'));
    const data = await response.json();
    expect(data.records).toBeDefined();
  });
});
```

## E2E Test Patterns

### Page Coverage Tests

The most comprehensive e2e test checks all 62 tool pages load without errors:

```typescript
// tests/e2e/page-coverage.spec.ts
test('Page batch 1: Check 5 pages for console errors', async ({ page }) => {
  for (const url of batch) {
    await page.goto(url);
    await expect(page.locator('body')).toBeVisible();

    const errors = await page.evaluate(() => window.__testConsoleErrors);
    expect(errors).toHaveLength(0);
  }
});
```

### Critical Flow Tests

Key user journeys are tested end-to-end:

```typescript
// tests/e2e/critical-flows.spec.ts
test('IPv4 subnet calculation flow', async ({ page }) => {
  await page.goto('/subnetting/ipv4-subnet-calculator');
  await page.fill('input[name="cidr"]', '192.168.1.0/24');
  await page.click('button[type="submit"]');

  await expect(page.locator('.result')).toContainText('254 hosts');
});
```

## Writing Tests

### Unit Test Best Practices

```typescript
// Good: Descriptive test names
test('should calculate correct subnet mask for /24 CIDR', () => {
  const result = cidrToSubnetMask(24);
  expect(result).toBe('255.255.255.0');
});

// Good: Edge case testing
test('should handle invalid CIDR input gracefully', () => {
  expect(() => cidrToSubnetMask(33)).toThrow('Invalid CIDR');
  expect(() => cidrToSubnetMask(-1)).toThrow('Invalid CIDR');
});

// Good: Multiple assertions for complex objects
test('should return complete subnet information', () => {
  const subnet = calculateSubnet('10.0.0.0/16');

  expect(subnet.network).toBe('10.0.0.0');
  expect(subnet.broadcast).toBe('10.0.255.255');
  expect(subnet.hostCount).toBe(65534);
  expect(subnet.firstHost).toBe('10.0.0.1');
  expect(subnet.lastHost).toBe('10.0.255.254');
});
```

### E2E Test Best Practices

```typescript
// Good: Wait for content to load
await page.waitForLoadState('networkidle');
await expect(page.locator('input').first()).toBeVisible();

// Good: Clear error handling
try {
  await page.goto(url, { timeout: 10000 });
} catch (error) {
  console.error(`Failed to load ${url}: ${error.message}`);
  throw error;
}

// Good: Specific selectors
await page.click('[data-testid="calculate-button"]');
await page.fill('[aria-label="CIDR input"]', '192.168.1.0/24');
```

## Test Fixtures

Shared test data is organized in `tests/fixtures/`:

### Navigation Test Data

The [`nav-data.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/tests/fixtures/nav-data.ts) fixture provides SvelteKit-free navigation data for e2e tests:

```typescript
// Test-friendly navigation without SvelteKit dependencies
export const ALL_TEST_PAGES: NavItem[] = [
  ...TOP_NAV,
  ...SUB_NAV_PAGES,
  ...aboutPages,
  { href: '/', label: 'Home' }
];
```

This solves the architectural challenge where e2e tests need navigation data but can't import SvelteKit modules that contain virtual imports like `$app/paths`.

## Debugging Tests

### Unit Test Debugging

```bash
# Run specific test file
npm test -- cidr-split.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Debug with Chrome DevTools
npm test -- --inspect-brk
```

### E2E Test Debugging

```bash
# Run with UI for visual debugging
npm run test:e2e:ui

# Run headed (show browser)
npx playwright test --headed

# Debug specific test
npx playwright test --debug page-coverage.spec.ts
```

## CI/CD Integration

### GitHub Actions

Tests are automatically run in CI with:

- **Parallel execution** - Unit and e2e tests run simultaneously
- **Retry logic** - E2e tests retry up to 2 times on failure
- **Multiple reporters** - GitHub, HTML, and JUnit outputs
- **Artifact collection** - Test reports and screenshots saved on failure

### Coverage Reporting

Coverage reports are generated in multiple formats:
- **Terminal** - Summary during test runs
- **HTML** - Detailed coverage report in `coverage/index.html`
- **LCOV** - For integration with external tools

## Performance Considerations

### Test Speed Optimization

The test suite is optimized for speed:

- **Parallel execution** - Tests run across multiple workers
- **Test batching** - E2e tests group pages into batches of 5
- **Smart retries** - Only retry on genuine failures, not flaky tests
- **Minimal setup** - Tests avoid unnecessary browser startup time

IPv4 addresses have 2^32 possible values. Our CIDR calculation tests verify operations across the full address space efficiently.

### Memory Management

Large test suites require careful memory management:


- **Browser cleanup** - E2e tests properly close browser contexts
- **Test isolation** - Each test runs in a clean environment

## Quality Gates

### Pre-commit Checks

Before commits, the following must pass:
- All unit tests pass
- Coverage thresholds met
- ESLint rules satisfied
- Prettier formatting applied

### CI Requirements

Pull requests must satisfy:
- All tests pass in both Chrome and Firefox
- No new console errors introduced
- Coverage doesn't decrease
- E2e tests complete without timeouts

## Test Data Management

### Mock Services

Some tests use Mock Service Worker (MSW) for API mocking:

```typescript
// Mock DNS lookup responses
rest.get('/api/internal/diagnostics/dns', (req, res, ctx) => {
  return res(ctx.json({
    records: [{ type: 'A', value: '93.184.216.34' }]
  }));
});
```

### Test Constants

Reusable test data is centralized:

```typescript
// tests/fixtures/test-data.ts
export const VALID_CIDRS = [
  '192.168.1.0/24',
  '10.0.0.0/8',
  '172.16.0.0/12'
];

export const INVALID_CIDRS = [
  '192.168.1.0/33',
  '256.0.0.0/24',
  'not-an-ip/24'
];
```

This comprehensive testing approach ensures the networking toolbox remains reliable across its extensive feature set.
