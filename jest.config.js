module.exports = {
	clearMocks: true,
	moduleFileExtensions: ['js', 'ts'],
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts'],
	testRunner: 'jest-circus/runner',
	transform: {
		'^.+\\.ts$': 'ts-jest'
	},
	verbose: true,
	collectCoverage: true,
	coverageReporters: ["json", "lcov", "text", "clover", "html"],
	collectCoverageFrom: ["src/**/*.ts"]
};
