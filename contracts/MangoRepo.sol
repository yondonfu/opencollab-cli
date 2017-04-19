/*
 * Mango Repository
 * Copyright (C) 2016 Alex Beregszaszi
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License only.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
pragma solidity ^0.4.6;

contract MangoRepo {
  mapping (address => bool) maintainers;

  string[] refKeys;
  mapping (string => string) refs;

  string[] snapshots;

  struct Issue {
    uint id;
    address creator;
    string hash;
  }

  struct PullRequest {
    uint id;
    Issue issue;
    address creator;
    address fork;
  }

  Issue[] issues;
  PullRequest[] pullRequests;

  modifier maintainerOnly {
    if (!maintainers[msg.sender]) throw;
    _;
  }

  modifier creatorOnly(uint id) {
    if (issues[id].creator != msg.sender) throw;
    _;
  }

  function MangoRepo() {
    maintainers[msg.sender] = true;
  }

  function refCount() constant returns (uint) {
    return refKeys.length;
  }

  function refName(uint index) constant returns (string ref) {
    ref = refKeys[index];
  }

  function getRef(string ref) constant returns (string hash) {
    hash = refs[ref];
  }

  function __findRef(string ref) private returns (int) {
    /* Horrible way to add a new key to the list */

    for (var i = 0; i < refKeys.length; i++)
      if (strEqual(refKeys[i], ref))
        return i;

    return -1;
  }

  function setRef(string ref, string hash) {
    if (__findRef(ref) == -1)
      refKeys.push(ref);

    refs[ref] = hash;
  }

  function deleteRef(string ref) {
    int pos = __findRef(ref);
    if (pos != -1) {
      // FIXME: shrink the array?
      refKeys[uint(pos)] = "";
    }

    // FIXME: null? string(0)?
    refs[ref] = "";
  }

  function strEqual(string a, string b) private returns (bool) {
    return sha3(a) == sha3(b);
  }

  function snapshotCount() constant returns (uint) {
    return snapshots.length;
  }

  function getSnapshot(uint index) constant returns (string) {
    return snapshots[index];
  }

  function addSnapshot(string hash) {
    snapshots.push(hash);
  }

  function issueCount() constant returns (uint count) {
    return issues.length;
  }

  function getIssue(uint id) constant returns (string hash) {
    if (id >= issues.length || id < 0) throw;

    if (bytes(issues[id].hash).length == 0) {
      return '';
    } else {
      return issues[id].hash;
    }
  }

  function newIssue(string hash) {
    issues.push(Issue(issues.length - 1, msg.sender, hash));
  }

  function setIssue(uint id, string hash) creatorOnly(id) {
    if (id >= issues.length || id < 0) throw;

    issues[id].hash = hash;
  }

  function deleteIssue(uint id) creatorOnly(id) {
    if (id >= issues.length || id < 0) throw;
    if (bytes(issues[id].hash).length == 0) throw;

    delete issues[id];
  }

  function pullRequestCount() constant returns (uint count) {
    return pullRequests.length;
  }

  function getPullRequest(uint id) constant returns (address fork) {
    if (id >= pullRequests.length || id < 0) throw;

    if (pullRequests[id].fork == address(0)) {
      return address(0);
    } else {
      return pullRequests[id].fork;
    }
  }

  function openPullRequest(uint issueId, address fork) {
    if (bytes(issues[issueId].hash).length == 0) throw;

    pullRequests.push(PullRequest(pullRequests.length - 1, issues[issueId], msg.sender, fork));
  }

  function closePullRequest(uint id) creatorOnly(id) {
    if (id >= pullRequests.length || id < 0) throw;
    if (pullRequests[id].fork == address(0)) throw;

    delete pullRequests[id];
  }
}
