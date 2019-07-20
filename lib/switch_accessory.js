var TuyaWebApi = require('../lib/tuyawebapi');

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class SwitchAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {
    this.platform = platform;
    this.deviceId = deviceConfig.id;
    PlatformAccessory = platform.api.platformAccessory;

    ({ Accessory, Service, Characteristic, uuid: UUIDGen } = platform.api.hap);

    this.log = platform.log;
    this.homebridgeAccessory = homebridgeAccessory;
    this.deviceConfig = deviceConfig;

    // Create HomeKit Accessory
    if (this.homebridgeAccessory) {
      if (!this.homebridgeAccessory.context.deviceId) {
        this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      }
      this.log.info(
        'Existing Accessory found [%s] [%s] [%s]',
        homebridgeAccessory.displayName,
        homebridgeAccessory.context.deviceId,
        homebridgeAccessory.UUID);
      this.homebridgeAccessory.displayName = this.deviceConfig.name;
    }
    else {
      this.log.info('Creating New Accessory %s', this.deviceConfig.id);
      this.homebridgeAccessory = new PlatformAccessory(
        this.deviceConfig.name,
        UUIDGen.generate(this.deviceConfig.id),
        Accessory.Categories.OUTLET);
      this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      this.platform.registerPlatformAccessory(this.homebridgeAccessory);
    }

    this.outletService = this.homebridgeAccessory.getService(Service.Outlet);
    if (this.outletService) {
      this.outletService.setCharacteristic(Characteristic.Name, this.deviceConfig.name);
    }
    else {
      this.log.debug('Creating New Service %s', this.deviceConfig.id);
      this.outletService = this.homebridgeAccessory.addService(Service.Outlet, this.deviceConfig.name);
    }

    this.outletService.getCharacteristic(Characteristic.On)
      .on('get', (callback) => {

        // Retrieve device state from Tuya Web API
        this.platform.TuyaWebApi.getDeviceState(this.homebridgeAccessory.context.deviceId).then((data) => {
          callback(null, data.state);
          this.log.debug('[GET][%s]: %s', this.homebridgeAccessory.displayName, state);
        }).catch((error) => {
          callback(error);
          this.log.debug('[GET][%s] Error: %s', this.homebridgeAccessory.displayName, error);
        });

      })
      .on('set', (state, callback) => {
        
        // Set device state in Tuya Web API
        const value = true ? 1 : 0;
        this.platform.TuyaWebApi.setDeviceState(this.homebridgeAccessory.context.deviceId, 'turnOnOff', value).then((data) => {
          callback();
          this.log.debug('[SET][%s]: %s', this.homebridgeAccessory.displayName, state);
        }).catch((error) => {
          callback(error);
          this.log.debug('[SET][%s] Error: %s', this.homebridgeAccessory.displayName, error);
        });

      });

    this.homebridgeAccessory.on('identify', (paired, callback) => {
      this.log.debug('[IDENTIFY][%s]', this.homebridgeAccessory.displayName);
      callback();
    });
  }
}

module.exports = TuyaWebDiscover;