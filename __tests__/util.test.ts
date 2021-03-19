import { validateArgs } from '../src/util';


describe('util', () =>{

	it('validateArgs', () => {
		process.env['INPUT_USERNAME'] = 'username';
		process.env['INPUT_GITHUB_TOKEN'] = 'token';
		expect(() => {
			validateArgs();
		}).not.toThrowError();
	});
});
