# tropkcab

Backport changes from a pull request to other branches, with only a label.

## Usage

1. Configure the action in your `.github/workflows` folder
2. Create a user for the bot, and set the username in the config
   * This user will host the repository where the branch is created, and will create the PR.
   * It's perfectly fine to use your own username if you want to!
3. If you haven't yet, fork the repository to that users account
