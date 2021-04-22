import { group, warning } from '@actions/core';
import { exec } from '@actions/exec';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Creates a backport PR for each branch requested. Performing the following actions:
 * 1. Ensure the git repo is up to date
 * 2. Checkout the base branch from the origin repository
 * 3. Checkout the branch that will be PR'd from
 * 4. Apply the patches in order, using `git an -3 --ignore-whitespace <patch_file>`
 * 5. Push the branch, create a PR
 * 6. Copy across any non-backport labels
 * 7. Remove the backport label on the original PR
 *
 * @param backports - Branches to backport to
 * @param patches - Array of patches to be applied
 * @param options - Options
 * @param github - A pre-configured octokit instance from `getOctokit`
 */
export async function backportCommits(backport: { base: string, head: string }, patches: string[], options: { repo: string, push: boolean }): Promise<void> {
	const { base, head } = backport;

	await group(`Backporting to ${base}`, async () => {
		try {
			await exec('git', [ 'fetch', 'origin' ], { cwd: options.repo });
			await exec('git', [ 'checkout', `origin/${base}` ], { cwd: options.repo });
			await exec('git', [ 'checkout', '-b', head ], { cwd: options.repo });

			const patchFile = path.join(options.repo, `${options.repo}.patch`);
			for (const patch of patches) {
				await fs.writeFile(patchFile, patch, 'utf8');
				await exec('git', [ 'am', '-3', '--ignore-whitespace', patchFile ], { cwd: options.repo });
				await fs.unlink(patchFile);
			}

			if (options.push) {
				await exec('git', [ 'push', 'botrepo', head ], { cwd: options.repo });
			}
		} catch (error) {
			warning(error);
			let stdout = '';
			// this is run through execa to get the output directly
			await exec('git', ['diff'], {
				cwd: options.repo,
				listeners: {
					stdout: (out) => stdout += out.toString()
				}
			});

			error.diff = stdout;

			await exec('git', [ 'am', '--abort' ], { cwd: options.repo });
			// pass through diff output
			throw error;
		}
	});
}
