import {
  Accessory,
  Service,
  Characteristic,
  CharacteristicEventTypes,
} from 'hap-nodejs';

import TuyaWebApi from './tuyawebapi';
import { BaseAccessory } from './base_accessory';
import { pifyGetEvt, pifySetEvt } from './promisifyEvent';
import { TuyaDevice } from './types';

export class DimmerAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig: TuyaDevice) {
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.LIGHTBULB
    );

    // Characteristic.On
    this.service
      .getCharacteristic(Characteristic.On)
      .on(
        CharacteristicEventTypes.GET,
        pifyGetEvt(async () => {
          // Retrieve state from cache
          if (this.hasValidCache()) {
            return this.getCachedState(Characteristic.On);
          } else {
            // Retrieve device state from Tuya Web API
            try {
              const data = await this.platform.tuyaWebApi.getDeviceState(
                this.deviceId
              );
              this.log.debug(
                '[GET][%s] Characteristic.On: %s',
                this.homebridgeAccessory.displayName,
                data.state
              );
              this.setCachedState(Characteristic.On, data.state);
              return data.state;
            } catch (error) {
              this.log.error(
                '[GET][%s] Characteristic.On Error: %s',
                this.homebridgeAccessory.displayName,
                error
              );
              this.invalidateCache();
              throw error;
            }
          }
        })
      )
      .on(
        CharacteristicEventTypes.SET,
        pifySetEvt(async state => {
          // Set device state in Tuya Web API
          const value = state ? 1 : 0;

          try {
            const result = await this.platform.tuyaWebApi.setDeviceState(
              this.deviceId,
              'turnOnOff',
              { value: value }
            );

            this.log.debug(
              '[SET][%s] Characteristic.On: %s %s',
              this.homebridgeAccessory.displayName,
              state,
              value
            );
            this.setCachedState(Characteristic.On, state);
          } catch (error) {
            this.log.error(
              '[SET][%s] Characteristic.On Error: %s',
              this.homebridgeAccessory.displayName,
              error
            );
            this.invalidateCache();
            throw error;
          }
        })
      );

    // Characteristic.Brightness
    this.service
      .getCharacteristic(Characteristic.Brightness)
      .on(
        CharacteristicEventTypes.GET,
        pifyGetEvt(async () => {
          // Retrieve state from cache
          if (this.hasValidCache()) {
            return this.getCachedState(Characteristic.Brightness);
          } else {
            // Retrieve device state from Tuya Web API
            try {
              const data = await this.platform.tuyaWebApi.getDeviceState(
                this.deviceId
              );

              const percentage = Math.floor(
                (parseInt(data.brightness) / 255) * 100
              );
              this.log.debug(
                '[GET][%s] Characteristic.Brightness: %s (%s percent)',
                this.homebridgeAccessory.displayName,
                data.brightness,
                percentage
              );
              this.setCachedState(Characteristic.Brightness, percentage);
              return percentage;
            } catch (error) {
              this.log.error(
                '[GET][%s] Characteristic.Brightness Error: %s',
                this.homebridgeAccessory.displayName,
                error
              );
              this.invalidateCache();
              throw error;
            }
          }
        })
      )
      .on(
        CharacteristicEventTypes.SET,
        pifySetEvt(async percentage => {
          // NOTE: For some strange reason, the set value for brightness is in percentage.

          // Set device state in Tuya Web API
          try {
            const data = await this.platform.tuyaWebApi.setDeviceState(
              this.deviceId,
              'brightnessSet',
              {
                value: percentage,
              }
            );

            this.log.debug(
              '[SET][%s] Characteristic.Brightness: %s percent',
              this.homebridgeAccessory.displayName,
              percentage
            );
            this.setCachedState(Characteristic.Brightness, percentage);
          } catch (error) {
            this.log.error(
              '[SET][%s] Characteristic.Brightness Error: %s',
              this.homebridgeAccessory.displayName,
              error
            );
            this.invalidateCache();
            throw error;
          }
        })
      );
  }

  async updateState(data) {
    // Update device type specific state
    this.log.debug(
      '[UPDATING][%s]:',
      this.homebridgeAccessory.displayName,
      data
    );
    if (data.state) {
      const state = data.state === 'true';
      this.service.getCharacteristic(Characteristic.On).updateValue(state);
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
