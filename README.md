# OpenCollab

`opencollab` is a CLI tool built off a fork of [mango-admin](https://github.com/axic/mango-admin). It uses an extension of the [Mango](https://github.com/axic/mango) protocol to integrate issue tracking and pull requests into a remote protocol for Git that uses Ethereum smart contracts for repository access control and IPFS/Swarm for storage of git objects.

Issue tracking and pull requests are key components of a decentralized Github.

This is a WIP.

# Install

`opencollab` can be used with [TestRPC](https://github.com/ethereumjs/testrpc), a Node.js based Ethereum client for testing and development. It has not been tested or used with any other Ethereum client at the moment.

`npm install -g opencollab ethereumjs-testrpc`

Pushing a local Mango repository requires the `git-remote-mango` remote helper package. The original package is missing gas for certain state changing transactions associated with the Ethereum contract, but a fork of the package that includes gas for these transactions can be used instead.

```
git clone https://github.com/yondonfu/git-remote-mango
cd git-remote-mango
npm install -g .
```

# Usage

Make sure TestRPC is running. Gas usage has not been addressed so it is likely necessary to run TestRPC with a high gas limit.

`testrpc -l 1000000000`

Users can use `opencollab` with `git`.

```
$ git init
$ opencollab init
```

`opencollab` can be used in a Git workflow that developers are familiar with.

Users can submit feature requests and bug reports by adding an issue to a Mango repository.

```
$ git clone mango://0x1282226d5c656082c064616f7a4e697ba3d26ae1
$ mv 0x1282226d5c656082c064616f7a4e697ba3d26ae1 sample_project
$ cd sample_project
$ opencollab new-issue
```

Users can open pull requests to resolve issues by forking the Mango repository and initializing a new Mango repository.

```
$ cd sample_project
$ opencollab fork ../forked_project
$ cd ../forked_project
$ opencollab init
```

A user can make the relevant changes in the forked project, push the forked project and reference it in a new pull request.

```
$ cd forked_project
$ git add -A
$ git commit -m "Fixed issue #1"
$ git remote add mango mango://0xaf8843081fd0dc1c4b12053d0ec123a10b91de0e
$ git push mango master
$ cd ../sample_project
$ opencollab open-pull-request 0 0xaf8843081fd0dc1c4b12053d0ec123a10b91de0e
```

A maintainer can review the pull request by cloning the Mango repository using its contract address.
```
$ cd sample_project
$ opencollab pull-requests
$ opencollab get-pull-request 0
$ cd ..
$ git clone mango://0xaf8843081fd0dc1c4b12053d0ec123a10b91de0e
```

After reviewing the pull request, a maintainer can merge the fork referenced by the pull request and push the merged changes.

```
$ cd sample_project
$ opencollab merge-fork ../forked_project
$ opencollab close-pull-request 0
$ git push mango master
```

# Commands

## opencollab init

`opencollab init`

Initializes a Mango repository in the current directory. Current directory must already have a Git repository. An
Ethereum smart contract is created and the contract address is written to `.mango/contract`.

### Example:

```
$ opencollab init
Creating new Mango repository with maintainer: 0x424442e2ed202e27be6d4ddbd1557c2ea6b3ee19
Mango repository created: 0x1282226d5c656082c064616f7a4e697ba3d26ae1
Wrote contract address to .mango/contract
```

## opencollab status

`opencollab status`

Shows the status of the Mango repository. Displays the contract address, references and snapshots.

### Example:

```
$ opencollab status
Mango repository at 0x1282226d5c656082c064616f7a4e697ba3d26ae1
Reference: refs/heads/master -> 7aee85aa3e982204ef972fd3c7af66f782658780
Snapshot #0 -> QmWWxwozNAoLjkWG2fxnY9bTrHAwn7GGS8DCZBpz5uBYf2
```

## opencollab issues

`opencollab issues`

### Example:

```
$ opencollab issues
Issue #0 -> d7b1d896682b66d8a7b8e0233feefdece0a2b285ec6aa0705817115e87c9c803
```

Shows the currently open issues for the Mango repository. Issue ids are mapped to the Swarm hash of the issue.

## opencollab get-issue

`opencollab issues get-issue <id>`

Shows the issue content for a given issue id. The id is used to grab the Swarm hash from the smart contract and the hash is used to download
the actual issue content from Swarm.

### Example:

```
$ opencollab get-issue 1
Issue #1

Hello World!
```

## opencollab new-issue

`opencollab new-issue`

Creates a new issue for the Mango repository. Opens an editor (currently defaults to Vi) to edit issue content. Upon saving and closing the editor, the issue content is uploaded to Swarm and the contract updates the Swarm hash for the issue id.

### Example:

```
$ opencollab new-issue
[new] Issue #1 -> d7b1d896682b66d8a7b8e0233feefdece0a2b285ec6aa0705817115e87c9c803
```

## opencollab edit-issue

`opencollab edit-issue <id>`

Edits the issue content for a given issue id. Opens an editor (currently defaults to Vi) to edit issue content. Upon saving and closing the editor, the issue content is uploaded to Swarm and the contract updates the Swarm hash for the issue id.

### Example:

```
$ opencollab edit-issue 1
[edit] Issue #1 -> 7ec4db74cb79eeea8c784f34ff8788b284724ff3349a360b0dee6f69226a50f8
```

## opencollab delete-issue

`opencollab delete-issue <id>`

Deletes the issue for the Mango repository. Note that the issue id and its corresponding mapping to a Swarm hash are
deleted from the smart contract, but the issue content remains in Swarm.

### Example:

```
$ opencollab delete-issue 1
[delete] Issue #1
```

## opencollab fork

`opencollab fork <path>`

Forks the current Mango repository by recursively copying the current directory into the directory specified by the path. `.mango` is not copied
because the forked directory needs to initialize a new Mango repository.

### Example:

```
$ opencollab fork ../foo
Forking Mango repository...
Mango repository forked to ../foo
```

## opencollab merge-fork

`opencollab merge-fork <path>`

Merges the forked directory specified by the path into the current directory. The merge is performed using `git merge --no-commit` and then changes to `.mango` are ignored while performing the merge commit to make sure the `.mango` metadata of the current directory is not overwritten by the `.mango` metadata of the forked directory.

### Example:

```
$ opencollab merge-fork ../foo
Merging fork into Mango repository...
From ../foo
 * [new branch]      master     -> fork/master
Automatic merge went well; stopped before committing as requested
Unstaged changes after reset:
M	.mango/contract
[master a8aa2ca] merged fork/master
Fork merged into Mango repository.
```

## opencollab pull-requests

`opencollab pull-requests`

Shows the open pull requests for the Mango repository. Pull request ids are mapped to the contract address of the fork referenced by the pull request.

### Example:

```
$ opencollab pull-requests
Pull Request #0 -> 0xdee912e023f7604eef0827f380e7e39c0456d639
```

## opencollab get-pull-request

`opencollab get-pull-request <id>`

Shows the contract address of the fork referenced by a pull request given a pull request id.

### Example:

```
$ opencollab get-pull-request 1
Pull Request #0 -> 0xdee912e023f7604eef0827f380e7e39c0456d639
```

## opencollab open-pull-request

`opencollab open-pull-request <issueId> <forkAddress>`

Opens a new pull request referencing an existing issue id and the contract address of a fork.

### Example:

```
$ opencollab open-pull-request 0 0xdee912e023f7604eef0827f380e7e39c0456d639
[opened] Pull Request #0 for issue #0 -> 0xdee912e023f7604eef0827f380e7e39c0456d639
```

## opencollab close-pull-request

`opencollab close-pull-request <id>`

Closes a pull request for the Mango repository. Note that the pull request id and its corresponding mapping to the contract address
of a fork are deleted from the smart contract, but the actual contract associated with the fork remains. One option is to mark the contract associated with the fork obsolete.

### Example:

```
$ opencollab close-pull-request 1
[closed] Pull Request #0
```
