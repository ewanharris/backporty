import { GitHub } from '@actions/github/lib/utils';

/**
 * Gets the individual commits in a merged pull request, and returns a array of the individual patches
 * that make up the PR. Filtering out any 'Merge branch' pull requests
 *
 * @param {InstanceType<typeof GitHub>} github - A pre-configured octokit instance from `getOctokit`
 * @param {string} owner - The owner of the repo the PR is against
 * @param {string} repo - The name of the repo the PR is again
 * @param {number} pullRequestNumber - The pull request number
 * @returns {Promise<string[]>}
 */
export async function getCommits (github: InstanceType<typeof GitHub>, owner: string, repo: string, pullRequestNumber: number): Promise<string[]> {
	const commits = await github.pulls.listCommits({
		mediaType: {
			format: 'patch'
		},
		owner,
		pull_number: pullRequestNumber,
		repo,
	});
	
	const patches = [];

	for (const commit of commits.data) {
		if (/^Merge branch '\S+' into \S+/.test(commit.commit.message) || !commit.url) {
			continue;
		}

		if (!commit.url) {
			continue;
		}

		const { data } = await github.request(commit.url, {
			mediaType: {
				format: 'patch'
			}
		});
		patches.push(data);
	}

	return patches;
}
