# Testing Setup

This directory contains the testing configuration and test files for the Quvis quantum visualization application.

## Testing Framework

We use **Vitest** as our testing framework, which integrates seamlessly with our Vite build setup and provides excellent TypeScript support.

## Available Test Scripts

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once and exit
npm run test:run

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Project Structure

```
src/test/
├── README.md           # This file
├── setup.ts           # Test configuration and mocks
└── Heatmap.test.ts    # Unit tests for Heatmap LOD functions
```

## Test Configuration

### Setup File (`setup.ts`)

- Configures jest-dom matchers for DOM testing
- Mocks Three.js components to avoid WebGL dependencies
- Sets up window object properties for browser environment simulation

### Vitest Configuration (in `vite.config.ts`)

- Uses jsdom environment for DOM testing
- Includes global test functions (describe, it, expect)
- Excludes build and dependency directories
- Includes test file patterns: `*.test.{js,ts,tsx}` and `*.spec.{js,ts,tsx}`

## Writing Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { YourClass } from "../YourClass.js";

describe("YourClass", () => {
    let instance: YourClass;

    beforeEach(() => {
        instance = new YourClass();
    });

    it("should do something", () => {
        // Arrange
        const input = "test";

        // Act
        const result = instance.method(input);

        // Assert
        expect(result).toBe("expected");
    });
});
```

### Three.js Mocking

Three.js components are automatically mocked in the setup file. You can use them in your tests without worrying about WebGL context:

```typescript
import * as THREE from "three";

const camera = new THREE.PerspectiveCamera(); // This will be mocked
const geometry = new THREE.BufferGeometry(); // This will be mocked
```

## Current Test Coverage

### Heatmap LOD Functions

- ✅ `setLOD()` method with high/low levels
- ✅ Visibility state management
- ✅ Clustered mesh handling
- ✅ Edge cases and error handling
- ✅ Integration with other methods

## Best Practices

1. **Use descriptive test names** that explain what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Test edge cases** and error conditions
4. **Mock external dependencies** that are not part of the unit being tested
5. **Keep tests isolated** using `beforeEach` for fresh instances
6. **Test behavior, not implementation** details

## Running Specific Tests

```bash
# Run only Heatmap tests
npm test Heatmap

# Run tests matching a pattern
npm test "LOD"

# Run a specific test file
npm test src/test/Heatmap.test.ts
```

## Next Steps

Consider adding tests for:

- QubitGrid positioning logic
- Algorithm processing functions
- React component interactions
- Performance-critical operations
- Integration between components
