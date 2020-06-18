import {
  Accessory,
  Service,
  Characteristic,
  CharacteristicEventTypes,
} from 'hap-nodejs';

import TuyaWebApi from './tuyawebapi';
import { BaseAccessory } from './base_accessory';
import { TuyaDevice } from './types';

export class OutletAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig: TuyaDevice) {
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.OUTLET
    );

    this.service
      .getCharacteristic(Characteristic.On)
      .on(CharacteristicEventTypes.GET, callback => {
        // Retrieve state from cache
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(Characteristic.On));
        } else {
          // Retrieve device state from Tuya Web API
          this.platform.tuyaWebApi
            .getDeviceState(this.homebridgeAccessory.context.deviceId)
            .then(data => {
              this.log.debug(
                '[GET][%s] Characteristic.On: %s',
                this.homebridgeAccessory.displayName,
                data.state
              );
              this.setCachedState(Characteristic.On, data.state);
              callback(null, data.state);
            })
            .catch(error => {
              this.log.error(
                '[GET][%s] Characteristic.On Error: %s',
                this.homebridgeAccessory.displayName,
                error
              );
              this.invalidateCache();
              callback(error);
            });
        }
      })
      .on(CharacteristicEventTypes.SET, (state, callback) => {
        // Set device state in Tuya Web API
        const value = state ? 1 : 0;
        this.platform.tuyaWebApi
          .setDeviceState(
            this.homebridgeAccessory.context.deviceId,
            'turnOnOff',
            { value: value }
          )
          .then(() => {
            this.log.debug(
              '[SET][%s] Characteristic.On: %s %s',
              this.homebridgeAccessory.displayName,
              state,
              value
            );
            this.setCachedState(Characteristic.On, state);
            callback();
          })
          .catch(error => {
            this.log.error(
              '[SET][%s] Characteristic.On Error: %s',
              this.homebridgeAccessory.displayName,
              error
            );
            this.invalidateCache();
            callback(error);
          });
      });
  }

  async updateState(data: TuyaDevice['data']) {
    this.log.debug(
      '[UPDATING][%s]:',
      this.homebridgeAccessory.displayName,
      data
    );
    const state = data.state === true;
    this.service.getCharacteristic(Characteristic.On).updateValue(data.state);
    this.setCachedState(Characteristic.On, state);
  }
}
