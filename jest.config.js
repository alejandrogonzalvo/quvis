/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset for ts-jest
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle .js extensions in imports for ESM compatibility
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  transform: {
    // Use ts-jest for .ts and .tsx files
    '^.+\.tsx?$': [
      'ts-jest',
      {
        useESM: true, // Enable ESM support in ts-jest
        tsconfig: 'tsconfig.json', // Or your specific tsconfig file for tests
      },
    ],
  },
  // If you have .js files that need transformation (e.g. npzLoader.js)
  // and they are not using ES module syntax that Node.js understands directly,
  // you might need to add Babel or ensure they are compatible.
  // For now, we assume .js files are either ESM or Jest/Node can handle them.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // Treat .ts and .tsx as ESM
  globals: {
    // This is sometimes needed if your tsconfig.json has different settings
    // 'ts-jest': {
    //   useESM: true,
    // },
  },
}; 