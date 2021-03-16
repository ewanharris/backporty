export interface ActionArguments {
	username: string;
	ghToken: string;
}

export interface BackportCommitsOptions {
	pullRequestNumber: number;
	repo: string;
	botRepo: string;
	owner: string;
	push: boolean;
}
