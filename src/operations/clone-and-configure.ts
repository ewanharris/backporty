import { exec } from '@actions/exec';
import { ActionArguments } from '../interfaces';

/**
 * 
 * @param args - Arguments for the action
 * @param owner - Owner of the main repository
 * @param repo - Repo name
 */
export async function cloneAndConfigure(args: ActionArguments, owner: string, repo: string): Promise<void> {
	await exec('git', [
		'clone',
		`https://x-access-token:${args.ghToken}@github.com/${owner}/${repo}.git`,
	]);

	await exec('git', [
		'remote',
		'add',
		'botrepo',
		`https://x-access-token:${args.ghToken}@github.com/${args.username}/${repo}.git`,
	], { cwd: repo });

	await exec('git', [
		'config',
		'--global',
		'user.email',
		'github-actions[bot]@users.noreply.github.com',
	], { cwd: repo });

	await exec('git', [
		'config',
		'--global',
		'user.name',
		'github-actions[bot]'
	], { cwd: repo });
}
