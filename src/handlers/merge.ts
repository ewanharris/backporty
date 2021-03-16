import { debug, info } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { EventPayloads } from '@octokit/webhooks';
import { LABEL_REGEXP } from '../constants';
import { ActionArguments, BackportCommitsOptions } from '../interfaces';
import { backportCommits } from '../operations/backport-commits';
import { cloneAndConfigure } from '../operations/clone-and-configure';
import { getCommits } from '../operations/get-commits';

import pMap from 'p-map';

/**
 * Handler for when a PR has been closed. Will perform the following:
 * 
 * 1. Check if the close was a merge close
 * 2. Check the PRs labels to determine the backports to make and the labels to copy
 * 3. Clone and configure the repository
 * 4. Pull the commits from the PR, ignoring merge commits
 * 5. Perform each backport
 *  a. Backport the commits
 *  b. Create a PR
 *  c. Copy the required labels across
 *  d. Remove the 'backport <base>' label from the original PR
 *
 * @param payload - Payload of the event
 * @param args - Arguments for the action
 */
export async function handleMerge (payload: EventPayloads.WebhookPayloadPullRequest, args: ActionArguments): Promise<void> {
	const { labels, merged, merge_commit_sha, number, title } = payload.pull_request;
	const { name: repo, owner: { login: owner } } = payload.repository;

	if (!merged) {
		return;
	}

	const backports = [];
	const labelsToCopy = [];
	for (const label of labels) {
		const matches = LABEL_REGEXP.exec(label.name);
		if (!matches) {
			labelsToCopy.push(label.name);
			continue;
		}
		backports.push({
			base: matches[1],
			head:  `backport-${number}-to-${matches[1]}`
		});
	}

	if (!backports.length) {
		return;
	}

	const github = getOctokit(args.ghToken);

	info(`Backporting ${merge_commit_sha} from #${number}`);

	await cloneAndConfigure(args, owner, repo);

	const commits = await getCommits(github, owner, repo, number);

	const options: BackportCommitsOptions = {
		pullRequestNumber: number,
		botRepo: args.username,
		repo,
		owner,
		push: true
	};

	for (const backport of backports) {
		const { base, head } = backport;
		try {
			info('Backporting commits');
			await backportCommits(backport, commits, options);

			const body = `Backport of #${number}.\nSee that PR for full details.`;
			const backportTitle = `[Backport ${base}] ${title}`;

			// Create the PR
			info('Creating PR');
			const { data: createdPr } = await github.pulls.create({
				base,
				body,
				head: `${options.botRepo}:${head}`,
				maintainer_can_modify: true,
				owner: options.owner,
				repo: options.repo,
				title: backportTitle
			});

			// Copy over any labels
			if (labels?.length) {
				info('Copying labels');
				await github.issues.addLabels({
					issue_number: createdPr.number,
					labels: labelsToCopy,
					owner,
					repo
				});
			}

			// Remove the backport <base> label
			info('Removing backport request label');
			await github.issues.removeLabel({
				issue_number: options.pullRequestNumber,
				name: `backport ${base}`,
				owner,
				repo
			});
		} catch (error) {
			info('errored');
			info(error.message);
			const errorMessage = error.message;
	
			await github.issues.createComment({
				body: await getFailedBackportCommentBody({ base, commits, errorMessage, github, head }),
				issue_number: number,
				owner,
				repo
			});
		}
	}
}

async function getFailedBackportCommentBody ({
	base,
	commits,
	errorMessage,
	github,
	head
}: {
		base: string;
		commits: string[];
		errorMessage: string;
		github: InstanceType<typeof GitHub>;
		head: string;
	}): Promise<string> {

	const apiToPatchUrl = async (commitUrl: string) => {
		const { data } = await github.request(commitUrl);

		return `curl -s ${data.html_url}.patch | git am -3 --ignore-whitespace`;
	};

	const commitCommands = await pMap(commits, apiToPatchUrl);

	const runUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;

	return [
		`The backport to \`${base}\` failed:`,
		"```",
		errorMessage,
		"```",
		`Check [the run](${runUrl}) for full details`,
		"To backport manually, run these commands in your terminal:",
		"```bash",
		"# Fetch latest updates from GitHub",
		"git fetch",
		"# Check out the target branch",
		`git checkout ${base}`,
		"# Make sure it's up to date",
		"git pull",
		"# Check out your branch",
		`git checkout -b ${head}`,
		"# Apply the commits from the PR",
		...commitCommands,
		"# Push it to GitHub",
		`git push --set-upstream origin ${head}`,
		"```",
		`Then, create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
	].join('\n');
}
