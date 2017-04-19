import IPFS from 'ipfs';

export default class IPFSLib {
  constructor() {
    const repo = String(Math.random());

    this.node = new IPFS({
      repo: repo,
      init: false,
      start: false,
      EXPERIMENTAL: {
        pubsub: false
      }
    });
  }

  init() {
    return new Promise((resolve, reject) => {
      this.node.init({ emptyRepo: true, bits: 2048 }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this.node.start(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  put(buf) {
    return this.init()
      .then(() => this.start())
      .then(() => this.node.object.put(buf))
      .then(node => node.toJSON().multihash);
  }

  get(multihash) {
    console.log(multihash);
    return this.init()
      .then(() => this.start())
      .then(() => {
        console.log("here");
        this.node.object.get(new Buffer(multihash), { enc: 'base58' }, (err, data) => {
          console.log('cb');
          if (err) {
            console.log(err);
          } else {
            console.log(data);
          }
        });
        // return this.node.object.get(multihash, { enc: 'base58' });
      });      // .then(() => this.node.object.get(multihash, { enc: 'base58' }))
      // .then(node => node.toJSON());
  }
}
