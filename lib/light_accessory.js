const TuyaWebApi = require('./tuyawebapi');
const DimmerAccessory = require('./dimmer_accessory')

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class LightAccessory extends DimmerAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);

    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.LIGHTBULB
    )

    // Characteristic.Color
    this.service.getCharacteristic(Characteristic.Hue)
      .on('get', callback => {

        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.Hue));
        }
        else {

          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            this.log(data);

            // const percentage = Math.floor((parseInt(data.brightness) / 255) * 100);
            // this.log.debug('[GET][%s] Characteristic.Brightness: %s (%s percent)', this.homebridgeAccessory.displayName, data.brightness, percentage);
            // this.getCachedState(Characteristic.Hue, percentage);
            callback(null, null);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Hue Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });

        }
      })
      .on('set', (percentage, callback) => {

        // // Set device state in Tuya Web API
        // this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'colorSet', percentage).then(() => {
        //   this.log.debug('[SET][%s] Characteristic.Color: %s percent', this.homebridgeAccessory.displayName, percentage);
        //   this.setCachedState(Characteristic.Brightness, percentage);
        //   callback();
        // }).catch((error) => {
        //   this.log.error('[SET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
        //   this.invalidateCache();
        //   callback(error);
        // });

      });
  }

  updateState(data) {
    // Update device type specific state
    this.log.debug('[UPDATING][%s]:', this.homebridgeAccessory.displayName, data);
    // if (data.state) {
    //   const state = (data.state === 'true');
    //   this.service
    //     .getCharacteristic(Characteristic.On)
    //     .updateValue(state);
    //     this.setCachedState(Characteristic.On, state);
    // }
    // if (data.percentage) {
    //   const percentage = Math.floor((parseInt(data.brightness) / 255) * 100);
    //   this.service
    //     .getCharacteristic(Characteristic.Brightness)
    //     .updateValue(percentage);
    //     this.setCachedState(Characteristic.Brightness, percentage);
    // }
  }
}

module.exports = ColoredLightAccessory;