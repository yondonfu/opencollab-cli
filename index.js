import MangoRepoLib from './lib/mangoRepoLib';
import Web3 from 'web3';
import contract from 'truffle-contract';

import MangoRepoArtifact from './build/contracts/MangoRepo.json';

export default function(host, port, mangoAddress, fromAddress) {
  const provider = new Web3.providers.HttpProvider(`http:\/\/${host}:${port}`);
  const MangoRepo = contract(MangoRepoArtifact);

  return new MangoRepoLib(
    MangoRepo,
    mangoAddress,
    provider,
    fromAddress
  );
}
