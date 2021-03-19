import { ActionArguments } from '../../src/interfaces';
import { cloneAndConfigure } from '../../src/operations/clone-and-configure';

import * as exec from '@actions/exec';
describe('clone and configure', () => {

	it('should clone and configure a repo', async () => {
		const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		execSpy.mockImplementation(() => {}); // don't let the commands run

		const args: ActionArguments = {
			username: 'username',
			ghToken: 'token'
		};
		await cloneAndConfigure(args, 'ewanharris', 'tropkcab');

		expect(execSpy).toHaveBeenCalledTimes(4);
		expect(execSpy).nthCalledWith(1, 'git', ['clone', `https://x-access-token:token@github.com/ewanharris/tropkcab.git`]);
		expect(execSpy).nthCalledWith(2, 'git', ['remote', 'add', 'botrepo', 'https://x-access-token:token@github.com/username/tropkcab.git'], {cwd: 'tropkcab'});
		expect(execSpy).nthCalledWith(3, 'git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com'], {cwd: 'tropkcab'});
		expect(execSpy).nthCalledWith(4, 'git', ['config', '--global', 'user.name', 'github-actions[bot]'], {cwd: 'tropkcab'});
	});
});
