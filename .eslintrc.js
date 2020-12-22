module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'jest',
		'@typescript-eslint',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
	],
	rules: {
		indent: [ 'error', 'tab' ],
		semi: [ 'error', 'always']
	}
};
