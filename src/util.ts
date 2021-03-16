import * as core from '@actions/core';
import { ActionArguments } from './interfaces';

export function validateArgs(): ActionArguments {
	const args = {
		username: core.getInput('username', { required: true }),
		ghToken: core.getInput('github_token', { required: true })
	};
	return args;
}
