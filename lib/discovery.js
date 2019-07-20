import EventEmitter from 'events';
const TuyaWebApi = require('tuyawebapi');

class TuyaWebDiscover extends EventEmitter {
  constructor(log, config) {
    super();

    this.log = log;
    this.config = config;
  
  }
  
  async startDiscovery() {
  
  }
}

module.exports = TuyaWebDiscover;