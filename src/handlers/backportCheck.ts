import { debug, info } from '@actions/core';
import { getOctokit } from '@actions/github';
import { EventPayloads } from '@octokit/webhooks';
import { LABEL_REGEXP, STATUS_CHECK_PREFIX } from '../constants';
import { ActionArguments, BackportCommitsOptions } from '../interfaces';
import { backportCommits } from '../operations/backport-commits';
import { cloneAndConfigure } from '../operations/clone-and-configure';
import { getCommits } from '../operations/get-commits';


/**
 * Handler for when a PR has been labeled for a backport and is still open. Will perform the following
 *
 * 1. Clone and configure the repository
 * 2. Query for current status checks on PR
 * 3. Query for current labels on PR
 * 4. Determine backports that should be validated
 * 5. Pull the commits from the PR, ignoring merge commits
 * 6. Create or update status checks for each backport validation
 * 7. Perform each backport validation
 *  a. Backport the commits
 *  b. Update the status check
 * 
 * 
 *
 */
export async function handleBackportCheck (payload: EventPayloads.WebhookPayloadPullRequest, args: ActionArguments): Promise<void> {

	const { labels, number, title } = payload.pull_request;
	const { name: repo, owner: { login: owner } } = payload.repository;
	const github = getOctokit(args.ghToken);

	info('Checking for status check');
	const { data: allStatusChecks } = await github.checks.listForRef({
		owner,
		repo,
		ref: payload.pull_request.head.sha
	});

	const backportStatusChecks = allStatusChecks.check_runs.filter(run => run.name.startsWith(STATUS_CHECK_PREFIX));

	const backports = [];
	const statusChecks = [];
	for (const label of labels) {
		const matches = LABEL_REGEXP.exec(label.name);
		if (!matches) {
			continue;
		}

		backports.push({
			base: matches[1],
			head:  `backport-${number}-to-${matches[1]}`,
			target: matches[1]
		});

		const statusCheckName = `${STATUS_CHECK_PREFIX} ${matches[1]}`;
		const existingCheck = backportStatusChecks.find(run => run.name === statusCheckName);

		if (existingCheck) {
			debug(`Updating existing check ${existingCheck.name} (${existingCheck.id})`);
			const { data: check} = await github.checks.update({
				owner,
				repo,
				name: existingCheck.name,
				check_run_id: existingCheck.id,
				status: 'queued'
			});
			statusChecks.push(check);
		} else {
			debug(`Creating a new status check ${statusCheckName}`);
			const { data: check} = await github.checks.create({
				owner,
				repo,
				name: statusCheckName,
				status: 'queued',
				head_sha: payload.pull_request.head.sha
			});
			statusChecks.push(check);
		}
	}

	if (!backports.length) {
		return;
	}


	info(`Validating backporting of #${number}`);

	await cloneAndConfigure(args, owner, repo);

	const commits = await getCommits(github, owner, repo, number);

	const options: BackportCommitsOptions = {
		pullRequestNumber: number,
		botRepo: args.username,
		repo,
		owner,
		push: false
	};

	for (const backport of backports) {
		const { base, head, target } = backport;
		const checkName = `${STATUS_CHECK_PREFIX} ${target}`;
		const statusCheck = statusChecks.find(check => check.name === checkName);
		try {
			info('Backporting commits');
			await backportCommits(backport, commits, options);

			if (!statusCheck) {
				debug(`Status check for ${target} (${checkName}) does not exist. That is not expected`);
				continue;
			} 
			info('Update check');
			await github.checks.update({
				repo,
				owner,
				check_run_id: statusCheck.id,
				conclusion: 'success',
				output: {
					title: 'Backport validated',
					summary: `This PR can be cleanly backported to "${target}"`
				}
			});
		} catch (error) {
			info('Update check when failed');
			if (!statusCheck) {
				debug(`Status check for ${target} (${checkName}) does not exist. That is not expected`);
				continue;
			}

			const mdSeperator = '``````````````````````````````';

			await github.checks.update({
				repo,
				owner,
				check_run_id: statusCheck.id,
				conclusion: 'neutral',
				output: {
					title: 'Backport failed',
					summary: `This PR can not be cleanly backported to "${target}"`,
					text: error.diff
						? `Failed diff:\n${mdSeperator}diff\n${error.diff}\n${mdSeperator}`
						: undefined
				}
			});
		}
	}

}
