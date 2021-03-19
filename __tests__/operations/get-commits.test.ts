import { getCommits } from '../../src/operations/get-commits';
import { getOctokit } from '@actions/github';

describe('get commits', () => {
	it('should get commits', async () => {
		const github = getOctokit('no-token');

		jest.spyOn(github.pulls, 'listCommits').mockImplementation(() => {
			return {
				data: [
					{
						commit: {
							message: 'foo'
						},
						url: 'foo'
					}
				]
			} as any;
		});

		jest.spyOn(github, 'request').mockImplementation(() => {
			return {
				data: 'fooo'
			} as any;
		});

		const commits = await getCommits(github, 'ewanharris', 'tropkcab', 1337);
		expect(commits).toEqual(['fooo']);
	});

	it('should filter merge commits', async () => {
		const github = getOctokit('no-token');

		jest.spyOn(github.pulls, 'listCommits').mockImplementation(() => {
			return {
				data: [
					{
						commit: {
							message: 'foo'
						},
						url: 'foo',
					},
					{
						commit: {
							message: 'Merge branch \'foo\' into bar'
						},
						url: 'foo'
					}
				]
			} as any;
		});

		jest.spyOn(github, 'request').mockImplementation(() => {
			return {
				data: 'fooo'
			} as any;
		});

		const commits = await getCommits(github, 'ewanharris', 'tropkcab', 1337);
		expect(commits).toEqual(['fooo']);
	});
});
