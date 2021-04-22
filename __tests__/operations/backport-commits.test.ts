import { backportCommits } from '../../src/operations/backport-commits';

import * as exec from '@actions/exec';
import * as fs from 'fs';

describe('backport commits', () => {

	beforeEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(fs.promises, 'writeFile').mockImplementation(() => {
			return '' as any;
		});
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(fs.promises, 'unlink').mockImplementation(() => {
			return '' as any;
		});

	});

	it('should backport commits with no push', async () => {
		const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		execSpy.mockImplementation(() => {}); // don't let the commands run
		
		await backportCommits({base: 'foo', head: 'bar'}, ['foo'], { repo: 'test', push: false });

		expect(execSpy).toHaveBeenCalledTimes(4);
		expect(execSpy).nthCalledWith(1, 'git', ['fetch', 'origin'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(2, 'git', ['checkout', 'origin/foo'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(3, 'git', ['checkout', '-b', 'bar'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(4, 'git', ['am', '-3', '--ignore-whitespace', 'test.patch'], { cwd: 'test' });
	});

	it('should backport commits with push', async () => {
		const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		execSpy.mockImplementation(() => {}); // don't let the commands run
		
		await backportCommits({base: 'foo', head: 'bar'}, ['foo'], { repo: 'test', push: true });

		expect(execSpy).toHaveBeenCalledTimes(5);
		expect(execSpy).nthCalledWith(1, 'git', ['fetch', 'origin'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(2, 'git', ['checkout', 'origin/foo'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(3, 'git', ['checkout', '-b', 'bar'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(4, 'git', ['am', '-3', '--ignore-whitespace', 'test.patch'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(5, 'git', ['push', 'botrepo', 'bar'], { cwd: 'test' });
	});

	it('should abort on error', async () => {
		const diff = `
index bf455ce..c85706b 100644
--- a/package.json
+++ b/package.json
@@ -19,6 +19,7 @@
		"@actions/core": "^1.2.6",
		"@actions/exec": "^1.0.4",
		"@actions/github": "^4.0.0",
+    "execa": "^5.0.0",
		"p-map": "^4.0.0"
	},`;
		const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
		
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		execSpy.mockImplementation((command: string, args: string[], opts: exec.ExecOptions) => {
			if (args.includes('--ignore-whitespace')) {
				throw new Error('oh no');
			}

			if (args.includes('diff')) {
				if (opts?.listeners?.stdout) {
					opts.listeners.stdout(Buffer.from(diff));
				}
			}
		}); // don't let the commands run
		
		await expect(backportCommits({
			base: 'foo', head: 'bar'}, ['foo'], { repo: 'test', push: true })
		).rejects.toMatchObject({ message: 'oh no', diff });

		expect(execSpy).toHaveBeenCalledTimes(6);
		expect(execSpy).nthCalledWith(1, 'git', ['fetch', 'origin'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(2, 'git', ['checkout', 'origin/foo'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(3, 'git', ['checkout', '-b', 'bar'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(4, 'git', ['am', '-3', '--ignore-whitespace', 'test.patch'], { cwd: 'test' });
		expect(execSpy).nthCalledWith(5, 'git', ['diff'], { cwd: 'test', listeners: { stdout: expect.any(Function) } });
		expect(execSpy).nthCalledWith(6, 'git', ['am', '--abort'], { cwd: 'test' });

	});
});
