const TuyaWebApi = require('./tuyawebapi');
const BaseAccessory = require('./base_accessory')

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class CoverAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);

    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.WINDOW_COVERING
    )

    this.service.getCharacteristic(Characteristic.CurrentPosition)
      .on('get', (callback) => {

        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.CurrentPosition));
        }
        else {

          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            /* TODO: 
             * data.state is probably some current state of the cover, no idea what the states are.
             * its value needs to be converted to a value that HomeKit accepts.
             * Characteristic.CurrentPosition accepts a value between 0-100 percentage.
            */
            this.log.debug('[GET][%s] Characteristic.CurrentPosition: %s', this.homebridgeAccessory.displayName, data.state);
            this.getCachedState(Characteristic.CurrentPosition, data.state);
            callback(null, data.state);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.CurrentPosition Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });

        }
      })

    this.service.getCharacteristic(Characteristic.TargetPosition)
      .on('set', (state, callback) => {

        // Set device target state in Tuya Web API
        // turnOnOff value: 1 = Open the cover; 0 = Close the cover
        const value = state > 50 ? 1 : 0;
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'turnOnOff', value).then(() => {
          this.log.debug('[SET][%s] Characteristic.TargetPosition: %s %s', this.homebridgeAccessory.displayName, state, value);
          this.setCachedState(Characteristic.TargetPosition, state);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.TargetPosition Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });

      });

    this.service.getCharacteristic(Characteristic.HoldPosition)
      .on('set', (state, callback) => {

        // Set device hold state in Tuya Web API
        // startStop value: 0 = stop the cover; 1 = start the cover (assumption)
        const value = state ? 0 : 1;
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'startStop', value).then(() => {
          this.log.debug('[SET][%s] Characteristic.HoldPosition: %s %s', this.homebridgeAccessory.displayName, state, value);
          this.setCachedState(Characteristic.HoldPosition, state);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.HoldPosition Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });

      });
  }

  updateState(data) {
    this.log.debug('[UPDATING][%s]:', this.homebridgeAccessory.displayName, data);
    if (data.state) {
      this.service
        .getCharacteristic(Characteristic.On)
        .updateValue(data.state);
      this.setCachedState(Characteristic.On, data.state);
    }
  }
}

module.exports = CoverAccessory;