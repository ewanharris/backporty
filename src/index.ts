import * as core from '@actions/core';
import { context } from '@actions/github';
import { EventPayloads } from '@octokit/webhooks';
import { handleMerge } from './handlers/merge';
import { validateArgs } from './util';

async function run(): Promise<void> {
	try {
		const args = validateArgs();

		switch (context.payload.action) {
			case 'labeled':
			case 'closed':
				core.info('Handling close event');
				console.log(context);
				console.log(context.payload);
				await handleMerge(context.payload as EventPayloads.WebhookPayloadPullRequest, args);
				break;
			default:
				core.info(`No handler for ${context.payload.action}`);
				break;
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();
