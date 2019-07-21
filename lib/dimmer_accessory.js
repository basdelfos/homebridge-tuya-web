const TuyaWebApi = require('./tuyawebapi');
const BaseAccessory = require('./base_accessory')

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class DimmerAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);

    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.LIGHTBULB
    )

    // Characteristic.On
    this.service.getCharacteristic(Characteristic.On)
      .on('get', (callback) => {

        // Retrieve device state from Tuya Web API
        this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
          this.log.debug('[GET][%s] Characteristic.On: %s', this.homebridgeAccessory.displayName, data.state);
          callback(null, data.state);
        }).catch((error) => {
          this.log.error('[GET][%s] Characteristic.On Error: %s', this.homebridgeAccessory.displayName, error);
          callback(error);
        });

      })
      .on('set', (state, callback) => {

        // Set device state in Tuya Web API
        const value = state ? 1 : 0;
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'turnOnOff', value).then(() => {
          this.log.debug('[SET][%s] Characteristic.On: %s %s', this.homebridgeAccessory.displayName, state, value);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.On Error: %s', this.homebridgeAccessory.displayName, error);
          callback(error);
        });

      });

    // Characteristic.Brightness
    this.service.getCharacteristic(Characteristic.Brightness)
      .on('get', callback => {

        // Retrieve device state from Tuya Web API
        this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
          const percentage = Math.floor((parseInt(data.brightness) / 255) * 100);
          this.log.debug('[GET][%s] Characteristic.Brightness: %s (%s percent)', this.homebridgeAccessory.displayName, data.brightness, percentage);
          callback(null, percentage);
        }).catch((error) => {
          this.log.error('[GET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
          callback(error);
        });

      })
      .on('set', (percentage, callback) => {

        // NOTE: For some strange reason, the set value for brightness is in percentage

        // Set device state in Tuya Web API
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'brightnessSet', percentage).then(() => {
          this.log.debug('[SET][%s] Characteristic.Brightness: %s percent', this.homebridgeAccessory.displayName, percentage);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
          callback(error);
        });

      });
  }

  updateState(data) {
    this.log.debug('[UPDATING][%s]:', this.homebridgeAccessory.displayName, data);
    if (data.state) {
      this.service
        .getCharacteristic(Characteristic.On)
        .updateValue(data.state === 'true');
    }
    if (data.percentage) {
      const percentage = Math.floor((parseInt(data.brightness) / 255) * 100);
      this.service
        .getCharacteristic(Characteristic.Brightness)
        .updateValue(percentage);
    }
  }
}

module.exports = DimmerAccessory;