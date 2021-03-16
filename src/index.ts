import * as core from '@actions/core';
import { context } from '@actions/github';
import { EventPayloads } from '@octokit/webhooks';
import { handleMerge } from './handlers/merge';
import { validateArgs } from './util';

async function run(): Promise<void> {
	try {
		const args = validateArgs();

		switch (context.eventName) {
			case 'closed':
				await handleMerge(context.payload as EventPayloads.WebhookPayloadPullRequest, args);
				break;
			default:
				core.debug(`No handler for ${context.eventName}`);
				break;
		}
	} catch (error) {
		console.log(core);
		core.setFailed(error.message);
	}
}

run();
