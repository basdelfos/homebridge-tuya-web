const TuyaWebApi = require('./tuyawebapi');
const BaseAccessory = require('./base_accessory')

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class LightAccessory extends BaseAccessory {
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

        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.On));
        }
        else {

          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            this.log.debug('[GET][%s] Characteristic.On: %s', this.homebridgeAccessory.displayName, data.state);
            this.getCachedState(Characteristic.On, data.state);
            callback(null, data.state);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.On Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });

        }
      })
      .on('set', (state, callback) => {

        // Set device state in Tuya Web API
        const value = state ? 1 : 0;
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'turnOnOff', { value: value }).then(() => {
          this.log.debug('[SET][%s] Characteristic.On: %s %s', this.homebridgeAccessory.displayName, state, value);
          this.setCachedState(Characteristic.On, state);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.On Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });

      });

    // Characteristic.Brightness
    this.service.getCharacteristic(Characteristic.Brightness)
      .on('get', callback => {

        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.Brightness));
        }
        else {

          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            const percentage = Math.floor((parseInt(data.brightness) / 255) * 100);
            this.log.debug('[GET][%s] Characteristic.Brightness: %s (%s percent)', this.homebridgeAccessory.displayName, data.brightness, percentage);
            this.getCachedState(Characteristic.Brightness, percentage);
            callback(null, percentage);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });

        }
      })
      .on('set', (percentage, callback) => {

        // NOTE: For some strange reason, the set value for brightness is in percentage.

        // Set device state in Tuya Web API
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'brightnessSet', { value: percentage }).then(() => {
          this.log.debug('[SET][%s] Characteristic.Brightness: %s percent', this.homebridgeAccessory.displayName, percentage);
          this.setCachedState(Characteristic.Brightness, percentage);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });

      });

    // Characteristic.Saturation
    this.service.getCharacteristic(Characteristic.Saturation)
      .on('get', callback => {

        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.Saturation));
        }
        else {

          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            const percentage = data.color.saturation // 0-100
            this.log.debug('[GET][%s] Characteristic.Saturation: %s (%s percent)', this.homebridgeAccessory.displayName, data.brightness, percentage);
            this.getCachedState(Characteristic.Saturation, percentage);
            callback(null, percentage);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Saturation Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });

        }
      })
      .on('set', (percentage, callback) => {
        let hsv_color = {};
        hsv_color.hue = this.getCachedState(Characteristic.Hue);
        hsv_color.saturation = percentage;
        
        // Set device state in Tuya Web API
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'colorSet', { color: hsv_color }).then(() => {
          this.log.debug('[SET][%s] Characteristic.Saturation: %s percent', this.homebridgeAccessory.displayName, percentage);
          this.setCachedState(Characteristic.Saturation, percentage);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.Saturation Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });

      });

    // Characteristic.Hue
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
            callback(null, 100);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Hue Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });

        }
      })
      .on('set', (percentage, callback) => {
        this.log(percentage);

        // // NOTE: For some strange reason, the set value for brightness is in percentage.

        // // Set device state in Tuya Web API
        // this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'colorSet', percentage).then(() => {
        //   this.log.debug('[SET][%s] Characteristic.Hue: %s percent', this.homebridgeAccessory.displayName, percentage);
        //   this.setCachedState(Characteristic.Hue, percentage);
        //   callback();
        // }).catch((error) => {
        //   this.log.error('[SET][%s] Characteristic.Hue Error: %s', this.homebridgeAccessory.displayName, error);
        //   this.invalidateCache();
        //   callback(error);
        // });

      });
  }

  updateState(data) {
    // Update device type specific state
    this.log.debug('[UPDATING][%s]:', this.homebridgeAccessory.displayName, data);
    if (data.state) {
      const state = (data.state === 'true');
      this.service
        .getCharacteristic(Characteristic.On)
        .updateValue(state);
        this.setCachedState(Characteristic.On, state);
    }
    if (data.percentage) {
      const percentage = Math.floor((parseInt(data.brightness) / 255) * 100);
      this.service
        .getCharacteristic(Characteristic.Brightness)
        .updateValue(percentage);
        this.setCachedState(Characteristic.Brightness, percentage);
    }
  }
}

module.exports = LightAccessory;