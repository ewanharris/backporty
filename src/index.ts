import * as core from '@actions/core';
import { context } from '@actions/github';
import { EventPayloads } from '@octokit/webhooks';
import { handleBackportCheck } from './handlers/backportCheck';
import { handleMerge } from './handlers/merge';
import { validateArgs } from './util';

async function run(): Promise<void> {
	try {
		const args = validateArgs();

		switch (context.payload.action) {
			case 'closed':
				core.info('Handling close event');
				if ((context.payload as EventPayloads.WebhookPayloadPullRequest).pull_request.merged) {
					await handleMerge(context.payload as EventPayloads.WebhookPayloadPullRequest, args);
				} else {
					core.info('Ignoring as pull request was not merged');
				}
				break;
			case 'labeled':
				core.info('Handling labeled event');
				if ((context.payload as EventPayloads.WebhookPayloadPullRequest).pull_request.merged) {
					await handleMerge(context.payload as EventPayloads.WebhookPayloadPullRequest, args);
				} else {
					await handleBackportCheck(context.payload as EventPayloads.WebhookPayloadPullRequest, args);
				}
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
