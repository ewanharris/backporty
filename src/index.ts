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
				core.info('Handling close event');
				await handleMerge(context.payload as EventPayloads.WebhookPayloadPullRequest, args);
				break;
			default:
				core.info(`No handler for ${context.eventName}`);
				break;
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();
