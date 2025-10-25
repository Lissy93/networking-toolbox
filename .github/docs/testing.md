# Testing Guide

The app uses a comprehensive testing strategy with unit tests (Vitest) and end-to-end tests (Playwright) to ensure reliability across its 100+ networking tools.


## Checks

Before opening a pull request, you should ensure that all the following checks pass.<br>
You can do this quickly, by running `npm run hold-my-beer`.

The [`check.yml`](https://github.com/Lissy93/networking-toolbox/blob/main/.github/workflows/check.yml) GitHub Actions workflow will prevent PRs being merged until checks pass.

### Formatting
We use Prettier for consistent code formatting.<br>
This can be run with `npm run format`.<br>
It uses the config in [`.prettierrc`](https://github.com/Lissy93/networking-toolbox/blob/main/.prettierrc) config.

### Linting
ESLint is used to enforce code quality and style.<br>
Run `npm run lint` to check for linting issues.<br>
It uses the rules defined in [`.eslint.config.js`](https://github.com/Lissy93/networking-toolbox/blob/main/eslint.config.js).

### Type Checking
TypeScript strict mode is enabled for robust type checking.<br>
Run `npm run types` to perform type checks.<br>
It uses the settings in [`tsconfig.json`](https://github.com/Lissy93/networking-toolbox/blob/main/tsconfig.json).

### Svelte Checks
SvelteKit's built-in checks are used to catch framework-specific issues.<br>
Run `npm run check` to execute these checks.<br>
It is configured via [`svelte.config.js`](https://github.com/Lissy93/networking-toolbox/blob/main/svelte.config.js).

### Build Check
A build check ensures the app compiles correctly.<br>
Run `npm run build-check` to verify the build process.<br>
It is configured in [`vite.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/vite.config.ts).

### Unit Tests
Unit tests are written with Vitest and cover utilities, components, routes and content.<br>
Run `npm test` to execute all unit tests.<br>
Tests are configured in [`vitest.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/vitest.config.ts)

### End-to-End Tests
End-to-end tests use Playwright to simulate user interactions and verify critical flows.<br>
Run `npm run test:e2e` to execute E2E tests.<br>
Tests are configured in [`playwright.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/playwright.config.ts)

### API Tests
API endpoints are tested with Vitest to ensure correct responses and error handling.<br>
Run `npm run test:api` to execute API tests.<br>
Tests are configured in [`tests/vitest.api.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/tests/vitest.api.config.ts)

### Code Quality
We use Codacy to get a vague idea of code complexity, patterns, duplication and other quality metrics.<br>
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/f4c10617d9a848d9ba4e03a654104d5a)](https://app.codacy.com/gh/Lissy93/networking-toolbox/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

### Test Coverage
The minimum threshold for test coverage is around 80%. Below is a summary of current covered files.<br>
Run `npm run test:coverage` to view results.<br>
We use [codecov](https://app.codecov.io/gh/Lissy93/networking-toolbox) to manage this.

![coverage](https://codecov.io/gh/Lissy93/networking-toolbox/graphs/sunburst.svg?token=SYC33JEQE1)

---

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

### API Tests (Vitest)
API tests in `tests/api/` validate:
- **Endpoint Responses** - Correct data and status codes
- **Error Handling** - Graceful failure modes
- **Performance** - Response times under load
- **Security** - Basic vulnerability checks

---

## Configuration Files

### Test and Check Config Files
- Tests are configured via [`vitest.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/vitest.config.ts)
- Playwright tests are configured via [`playwright.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/playwright.config.ts)
- Lint config is in [`.eslint.config.js`](https://github.com/Lissy93/networking-toolbox/blob/main/eslint.config.js)
- Typescript config it in [`tsconfig.json`](https://github.com/Lissy93/networking-toolbox/blob/main/tsconfig.json)
- Coverage requirements are in [`codecov.yaml`](https://github.com/Lissy93/networking-toolbox/blob/main/codecov.yaml)
- Prettier config is in [`.prettierrc`](https://github.com/Lissy93/networking-toolbox/blob/main/.prettierrc)
- API test config is in [`tests/vitest.api.config.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/tests/vitest.api.config.ts)

### Core Project Config Files
- Svelte config is in [`svelte.config.js`](https://github.com/Lissy93/networking-toolbox/blob/main/svelte.config.js)
- Main app scripts, dependencies and info is in [`package.json`](https://github.com/Lissy93/networking-toolbox/blob/main/package.json)
- NPM config is in [`.npmrc`](https://github.com/Lissy93/networking-toolbox/blob/main/.npmrc)
- NPM version is in [`.nvmrc`](https://github.com/Lissy93/networking-toolbox/blob/main/.nvmrc)

---

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

