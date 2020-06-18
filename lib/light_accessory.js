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
    );

    // homekit compatible defaults
    const defaultBrightness = 100;  // 100%
    const defaultSaturation = 100;  // 100%
    const defaultHue = 359;         // red (max hue)

    // Characteristic.On
    this.service.getCharacteristic(Characteristic.On)
      .on('get', (callback) => {
        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.On));
        } else {
          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            this.log.debug('[GET][%s] Characteristic.On: %s', this.homebridgeAccessory.displayName, data.state);
            this.setCachedState(Characteristic.On, data.state);
            callback(null, data.state);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.On Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });
        }
      })
      .on('set', (isOn, callback) => {
        // Set device state in Tuya Web API
        const value = isOn ? 1 : 0;

        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'turnOnOff', { value: value }).then(() => {
          this.log.debug('[SET][%s] Characteristic.On: %s %s', this.homebridgeAccessory.displayName, isOn, value);
          this.setCachedState(Characteristic.On, isOn);
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
        } else {
          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            // data.brightness only valid for color_mode!=color > https://github.com/PaulAnnekov/tuyaha/blob/master/tuyaha/devices/light.py
            // however, according to local tuya app, calculation for color_mode=color is stil incorrect (even more so in lower range)

            let rawValue;
            let percentage;

            if (data.color_mode == 'color' || data.color_mode == 'colour') {
              rawValue = data.color.brightness;   // 0-100 
              percentage = rawValue;
            } else {
              rawValue = data.brightness;         // 0-255
              percentage = Math.floor(rawValue / 255) * 100;  // 0-100 
            }

            this.log.debug('[GET][%s] Characteristic.Brightness: %s (%s percent)', this.homebridgeAccessory.displayName, rawValue, percentage);
            this.setCachedState(Characteristic.Brightness, percentage);
            callback(null, percentage);
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });
        }
      })
      .on('set', (percentage, callback) => {
        // NOTE: For some strange reason, the set value for brightness is in percentage
        const value = percentage; // 0-100

        // Set device state in Tuya Web API
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'brightnessSet', { value: value }).then(() => {
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
        } else {
          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            if (data.color) {
              const saturation = data.color.saturation; // 0-100
              const hue = data.color.hue; // 0-359
              this.log.debug('[GET][%s] Characteristic.Saturation: %s', this.homebridgeAccessory.displayName, saturation);
              this.setCachedState(Characteristic.Saturation, saturation);
              this.setCachedState(Characteristic.Hue, hue);
              callback(null, saturation);
            }
            else {
              callback(null, null);
            }
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Saturation Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });
        }
      })
      .on('set', (percentage, callback) => {
        let color = {};

        const cachedBrightness = this.getCachedState(Characteristic.Brightness);
        const cachedHue = this.getCachedState(Characteristic.Hue);

        color.brightness = cachedBrightness ? cachedBrightness : defaultBrightness; // 0-100
        color.saturation = Math.floor(percentage / 100) * 255; // 0-255
        color.hue = cachedHue ? cachedHue : defaultHue; // 0-359

        // Set device state in Tuya Web API
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'colorSet', { color: color }).then(() => {
          this.log.debug('[SET][%s] Characteristic.Saturation: (%s) %s percent', this.homebridgeAccessory.displayName, color.saturation, percentage);
          this.setCachedState(Characteristic.Brightness, color.brightness);
          this.setCachedState(Characteristic.Saturation, percentage);
          this.setCachedState(Characteristic.Hue, color.hue);
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
        } else {
          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi.getDeviceState(this.deviceId).then((data) => {
            if (data.color) {
              const saturation = data.color.saturation; // 0-100
              const hue = data.color.hue; // 0-359
              this.log.debug('[GET][%s] Characteristic.Hue: %s', this.homebridgeAccessory.displayName, hue);
              this.setCachedState(Characteristic.Saturation, saturation);
              this.setCachedState(Characteristic.Hue, hue);
              callback(null, hue);
            }
            else {
              callback(null, null);
            }
          }).catch((error) => {
            this.log.error('[GET][%s] Characteristic.Hue Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });
        }
      })
      .on('set', (hue, callback) => {
        let color = {};

        const cachedBrightness = this.getCachedState(Characteristic.Brightness);
        const cachedSaturation = this.getCachedState(Characteristic.Saturation);

        color.brightness = cachedBrightness ? cachedBrightness : defaultBrightness; // 0-100
        color.saturation = cachedSaturation ? Math.floor(cachedSaturation / 100) * 255 : defaultSaturation; // 0-255
        const newSaturationPercentage = Math.floor(color.saturation / 255) * 100;
        color.hue = hue;

        // Set device state in Tuya Web API
        this.platform.tuyaWebApi.setDeviceState(this.deviceId, 'colorSet', { color: color }).then(() => {
          this.log.debug('[SET][%s] Characteristic.Hue: %s', this.homebridgeAccessory.displayName, hue);
          this.setCachedState(Characteristic.Brightness, color.brightness);
          this.setCachedState(Characteristic.Saturation, newSaturationPercentage);
          this.setCachedState(Characteristic.Hue, color.hue);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.Hue Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });
      });
  }

  updateState(data) {
    // Update device type specific state
    this.log.debug('[UPDATING][%s]:', this.homebridgeAccessory.displayName, data);

    if (data.state) {
      const isOn = (data.state === 'true');
      this.service
        .getCharacteristic(Characteristic.On)
        .updateValue(isOn);
      this.setCachedState(Characteristic.On, isOn);
    }
    if (data.brightness || data.color.brightness) {
      let rawValue;
      let percentage;

      if (data.color_mode == 'color' || data.color_mode == 'colour') {
        rawValue = data.color.brightness;   // 0-100 
        percentage = rawValue;
      } else {
        rawValue = data.brightness;         // 0-255
        percentage = Math.floor(rawValue / 255) * 100;  // 0-100 
      }

      this.service
        .getCharacteristic(Characteristic.Brightness)
        .updateValue(percentage);
      this.setCachedState(Characteristic.Brightness, percentage);
    }
    if (data.color && data.color.saturation) {
      let rawValue;
      let percentage;

      if (data.color_mode == 'color' || data.color_mode == 'colour') {
        rawValue = data.color.brightness;   // 0-100 
        percentage = rawValue;
      } else {
        rawValue = data.brightness;         // 0-255
        percentage = Math.floor(rawValue / 255) * 100;  // 0-100 
      }

      this.service
        .getCharacteristic(Characteristic.Saturation)
        .updateValue(percentage);
      this.setCachedState(Characteristic.Saturation, percentage);
    }
    if (data.color && data.color.hue) {
      const hue = data.color.hue;
      this.service
        .getCharacteristic(Characteristic.Hue)
        .updateValue(hue);
      this.setCachedState(Characteristic.Hue, hue);
    }
  }
}

module.exports = LightAccessory;
