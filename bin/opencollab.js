#!/usr/bin/env node

import yargs from 'yargs';
import mkdirp from 'mkdirp';
import fs from 'fs-extra';
import path from 'path';
import shell from 'shelljs';
import Web3 from 'Web3';

import { default as initLib } from '../index';
import IssueEditor from '../lib/issueEditor';
import Swarm from 'swarm-js';

const swarm = Swarm.at('http://swarm-gateways.net');

const RPC_HOST = 'localhost';
const RPC_PORT = '8545';

const CONTRACT_DIR = '.mango/contract/;';
const ISSUES_DIR = '.mango/issues/';

const args = yargs
      .option('host', {
        description: 'HTTP host of Ethereum node',
        alias: 'h',
        default: RPC_HOST
      })
      .option('port', {
        description: 'HTTP port of Ethereum node',
        alias: 'p',
        default: RPC_PORT
      })
      .option('account', {
        description: 'Sender account',
        alias: 'a',
        type: 'string'
      })
      .command('init', 'Create a Mango repository')
      .command('status', 'Check the status of a Mango repository')
      .command('issues', 'List issues for a Mango repository')
      .command('get-issue <id>', 'Get a issue for a Mango repository')
      .command('new-issue', 'Create a new issue for a Mango repository')
      .command('edit-issue <id>', 'Edit an issue for a Mango repository')
      .command('delete-issue <id>', 'Delete issue for a Mango repository')
      .command('fork <path>', 'Create a fork of a Mango repository')
      .command('merge-fork <path>', 'Merge a fork into a Mango repository')
      .command('pull-requests', 'List open pull requests for a Mango repository')
      .command('get-pull-request <id>', 'Get a pull request referencing a fork')
      .command('open-pull-request <issueId> <forkAddress>', 'Open a pull request referencing a fork')
      .command('close-pull-request <id>', 'Close a pull request referencing a fork')
      .help()
      .usage('Usage: $0 [command]');



function ensureGitRepo() {
  return new Promise((resolve, reject) => {
    fs.stat('.git', (err, stats) => {
      if (err) {
        reject(new Error('Need to be in a Git repository.'));
      } else {
        resolve(true);
      }
    });
  });
}

function getMangoAddress() {
  return new Promise((resolve, reject) => {
    fs.readFile('.mango/contract', 'utf-8', (err, data) => {
      if (err) {
        reject(new Error('Need to be in a Mango repository.'));
      } else {
        resolve(data);
      }
    });
  });
}

function ensureMangoRepo() {
  return ensureGitRepo()
    .then(getMangoAddress());
}

function setMango(address) {
  mkdirp('.mango/issues', err => {
    if (err) {
      console.error(err);
      return;
    } else {
      fs.writeFile('.mango/contract', address, err => {
        if (err) {
          console.error(err);
          return;
        } else {
          console.log('Wrote contract address to .mango/contract');
        }
      });
    }
  });
}

function getAccount() {
  const { host, port } = argv;

  const provider = new Web3.providers.HttpProvider(`http:\/\/${host}:${port}`);
  const web3 = new Web3(provider);

  return new Promise((resolve, reject) => {
    web3.eth.getAccounts((err, accounts) => {
      if (err != null) {
        reject(err);
      } else {
        resolve(accounts[0]);
      }
    });
  });
}

function mangoInit(account) {
  console.log('Creating new Mango repository with maintainer: ' + account);

  const { host, port } = argv;

  const mangoRepoLib = initLib(host, port, null, account);

  return mangoRepoLib.init()
    .then(address => {
      console.log('Mango repository created: ' + address);
      setMango(address);
    }).catch(err => console.error(err));
}

function mangoStatus(mangoAddress, account) {
  console.log('Mango repository at ' + mangoAddress);

  const { host, port } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);

  return mangoRepoLib.refs()
    .then(refs => {
      refs.map(ref => {
        console.log('Reference: ' + ref.name + ' -> ' + ref.ref);
      });
    })
    .then(() => mangoRepoLib.snapshots())
    .then(snapshots => {
      snapshots.map((snapshot, i) => {
        console.log('Snapshot #' + i + ' -> ' + snapshot);
      });
    });
}

function mangoIssues(mangoAddress, account) {
  const { host, port } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);

  return mangoRepoLib.issues().then(issues => {
    issues.map((issue, id) => {
      if (issue) {
        console.log('Issue #' + id + ' -> ' + issue);
      }
    });
  });
}

function mangoGetIssue(mangoAddress, account) {
  const { host, port, id } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);
  const editor = new IssueEditor();

  return mangoRepoLib.getIssue(id)
    .then(hash => swarm.download(hash))
    .then(buf => console.log(buf.toString()));
  }

function mangoNewIssue(mangoAddress, account) {
  const { host, port } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);
  const editor = new IssueEditor();

  return mangoRepoLib.issueCount()
    .then(count => {
      const id = count.toNumber();

      return editor.edit(ISSUES_DIR + id + '.txt')
        .then(buf => swarm.upload(buf))
        .then(hash => mangoRepoLib.newIssue(hash))
        .then(hash => console.log('[new] Issue #' + id + ' -> ' + hash));
      });
}

function mangoEditIssue(mangoAddress, account) {
  const { host, port, id } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);
  const editor = new IssueEditor();

  return mangoRepoLib.getIssue(id)
    .then(hash => swarm.download(hash))
    .then(buf => editor.edit(ISSUES_DIR + id + '.txt', buf.toString()))
    .then(buf => swarm.upload(buf))
    .then(hash => mangoRepoLib.setIssue(id, hash))
    .then(hash => console.log('[edit] Issue #' + id + ' -> ' + hash));
}

function mangoDeleteIssue(mangoAddress, account) {
  const { host, port, id } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);
  const editor = new IssueEditor();

  return mangoRepoLib.deleteIssue(id)
    .then(id => console.log('[delete] Issue #' + id));
}

function mangoFork() {
  console.log('Forking Mango repository...');

  const { path } = argv;

  const forkIgnore = [
    '.mango',
    'node_modules',
  ];

  const filter = name => {
    return forkIgnore.reduce((acc, file) => {
      return acc && !~name.indexOf(file);
    }, true);
  };

  fs.copy('.', path, {filter: filter}, err => {
    if (err) {
      console.error(err);
    } else {
      console.log('Mango repository forked to ' + path);

      shell.cd(path);

      if (shell.exec('git remote rm origin').code !== 0) {
        shell.echo('Error: Git remote rm failed');
        shell.exit(1);
      }
    }
  });
}

function mangoMergeFork() {
  console.log('Merging fork into Mango repository...');

  const { path } = argv;

  if (shell.exec('git remote add fork ' + path).code !== 0) {
    shell.echo('Error: Git remote add failed');
    shell.exit(1);
  }

  if (shell.exec('git fetch fork').code !== 0) {
    shell.echo('Error: Git fetch failed');
    shell.exit(1);
  }

  if (shell.exec('git merge --no-ff --no-commit --allow-unrelated-histories fork/master').code !== 0) {
    shell.echo('Error: Git merge failed');
    shell.exit(1);
  }

  if (shell.exec('git reset HEAD .mango').code !== 0) {
    shell.echo('Error: Git reset failed');
    shell.exit(1);
  }

  if (shell.exec('git checkout -- .mango').code !== 0) {
    shell.echo('Error: Git checkout failed');
    shell.exit(1);
  }

  if (shell.exec('git commit -m \"merged fork/master\"').code !== 0) {
    shell.echo('Error: Git commit failed');
    shell.exit(1);
  }

  if (shell.exec('git remote rm fork').code !== 0) {
    shell.echo('Error: Git remote rm failed');
    shell.exit(1);
  }

  console.log('Fork merged into Mango repository.');
}

function mangoPullRequests(mangoAddress, account) {
  const { host, port } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);

  return mangoRepoLib.pullRequests()
    .then(pullRequests => {
      pullRequests.map((pullRequest, i) => {
        if (pullRequest != '0x0000000000000000000000000000000000000000') {
          console.log('Pull Request #' + i + ' -> ' + pullRequest);
        }
      });
    });
}

function mangoGetPullRequest(mangoAddress, account) {
  const { host, port, id } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);

  return mangoRepoLib.getPullRequest(id)
    .then(forkAddress => console.log('Pull Request #' + id + ' -> ' + forkAddress));
}

function mangoOpenPullRequest(mangoAddress, account) {
  const { host, port, issueId, forkAddress } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);

  return mangoRepoLib.openPullRequest(issueId, forkAddress)
    .then(id => console.log('[opened] Pull Request #' + id + ' for issue #' + issueId + ' -> ' + forkAddress));
}

function mangoClosePullRequest(mangoAddress, account) {
  const { host, port, id } = argv;

  const mangoRepoLib = initLib(host, port, mangoAddress, account);

  return mangoRepoLib.closePullRequest(id)
    .then(id => console.log('[closed] Pull Request #' + id));
}

// CLI

const { argv } = args;

if (argv._.length === 0) {
  args.showHelp();
}

const command = argv._[0];

switch (command) {

  case 'init':
    ensureGitRepo()
      .then(() => getAccount())
      .then(account => mangoInit(account))
      .catch(err => console.error(err));

    break;

  case 'status':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoStatus(values[0], values[1]))
      .catch(err => console.error(err));

    break;

  case 'issues':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoIssues(values[0], values[1]))
      .catch(err => console.error(err));

    break;

  case 'get-issue': {
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoGetIssue(values[0], values[1]))
      .catch(err => console.error(err));

    break;
  }

  case 'new-issue':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoNewIssue(values[0], values[1]))
      .catch(err => console.error(err));

    break;

  case 'edit-issue':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoEditIssue(values[0], values[1]))
      .catch(err => console.error(err));

    break;

  case 'delete-issue':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoDeleteIssue(values[0], values[1]))
      .catch(err => console.error(err));

    break;

  case 'fork':
    ensureMangoRepo()
      .then(() => mangoFork())
      .catch(err => console.error(err));

    break;

  case 'merge-fork':
    ensureMangoRepo()
      .then(() => mangoMergeFork())
      .catch(err => console.error(err))

    break;

  case 'pull-requests':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoPullRequests(values[0], values[1]))
      .catch(err => console.error(err))

    break;

  case 'get-pull-request':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoGetPullRequest(values[0], values[1]))
      .catch(err => console.error(err))

    break;

  case 'open-pull-request':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoOpenPullRequest(values[0], values[1]))
      .catch(err => console.error(err))

    break;

  case 'close-pull-request':
    ensureMangoRepo()
      .then(() => Promise.all([getMangoAddress(), getAccount()]))
      .then(values => mangoClosePullRequest(values[0], values[1]))
      .catch(err => console.error(err));

    break;

  default:
    break;
}
