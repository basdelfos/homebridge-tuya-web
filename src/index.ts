import { SwitchAccessory } from './switch_accessory';
import { OutletAccessory } from './outlet_accessory';
import { DimmerAccessory } from './dimmer_accessory';
import { LightAccessory } from './light_accessory';
import TuyaWebApi from './tuyawebapi';

var Accessory, Service, Characteristic, UUIDGen;

export default function(homebridge) {
  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform(
    'homebridge-tuya-web',
    'TuyaWebPlatform',
    TuyaWebPlatform,
    true
  );
}

class TuyaWebPlatform {
  private pollingInterval: number;
  private refreshInterval: number;
  private tuyaWebApi: TuyaWebApi;
  private accessories: Map<string, any>;

  constructor(private log, private config, private api) {
    this.pollingInterval = 10; // default 10 seconds
    this.refreshInterval;

    if (!config || !config.options) {
      this.log('No config found, disabling plugin.');
      return;
    }

    // Set cloud polling interval
    this.pollingInterval = this.config.options.pollingInterval || 10;

    // Create Tuya Web API instance
    this.tuyaWebApi = new TuyaWebApi(
      this.config.options.username,
      this.config.options.password,
      this.config.options.countryCode,
      this.config.options.platform,
      this.log
    );

    this.accessories = new Map();

    if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on(
        'didFinishLaunching',
        function() {
          this.log('Initializing TuyaWebPlatform...');

          // Get access token
          this.tuyaWebApi
            .getOrRefreshToken()
            .then(token => {
              this.tuyaWebApi.token = token;

              // Start discovery for devices
              this.tuyaWebApi
                .discoverDevices()
                .then(devices => {
                  // Add devices to Homebridge
                  for (const device of devices) {
                    this.addAccessory(device);
                  }
                  // Get device strate of all devices - once
                  this.refreshDeviceStates();
                })
                .catch(error => {
                  this.log.error(error);
                });

              // Set interval for refreshing device states
              this.refreshInterval = setInterval(() => {
                this.refreshDeviceStates();
              }, this.pollingInterval * 1000);
            })
            .catch(error => {
              this.log.error(error);
            });
        }.bind(this)
      );
    }
  }

  refreshDeviceStates() {
    this.log.debug('Refreshing state for all devices...');
    this.tuyaWebApi
      .getAllDeviceStates()
      .then(devices => {
        // Refresh device states
        for (const device of devices) {
          const uuid = this.api.hap.uuid.generate(device.id);
          const homebridgeAccessory = this.accessories.get(uuid);
          if (homebridgeAccessory) {
            homebridgeAccessory.controller.updateAccessory(device);
          } else {
            this.log.error('Could not find accessory in dictionary');
          }
        }
      })
      .catch(error => {
        this.log.error('Error retrieving devices states', error);
      });
  }

  addAccessory(device) {
    var deviceType = device.dev_type || 'switch';
    this.log.info(
      'Adding: %s (%s / %s)',
      device.name || 'unnamed',
      deviceType,
      device.id
    );

    // Get UUID
    const uuid = this.api.hap.uuid.generate(device.id);
    const homebridgeAccessory = this.accessories.get(uuid);

    // Is device type overruled in config defaults?
    if (this.config.defaults) {
      for (const def of this.config.defaults) {
        if (def.id === device.id) {
          deviceType = def.device_type || deviceType;
          this.log('Device type is overruled in config to: ', deviceType);
        }
      }
    }

    // Construct new accessory
    let deviceAccessory;
    switch (deviceType) {
      case 'light':
        deviceAccessory = new LightAccessory(this, homebridgeAccessory, device);
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        break;
      case 'dimmer':
        deviceAccessory = new DimmerAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        break;
      case 'switch':
      case 'outlet':
        deviceAccessory = new OutletAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        break;
      default:
        this.log.warn('Could not init class for device type [%s]', deviceType);
        break;
    }
  }

  // Called from device classes
  registerPlatformAccessory(platformAccessory) {
    this.log.debug(
      'Register Platform Accessory (%s)',
      platformAccessory.displayName
    );
    this.api.registerPlatformAccessories(
      'homebridge-tuya-web',
      'TuyaWebPlatform',
      [platformAccessory]
    );
  }

  // Function invoked when homebridge tries to restore cached accessory.
  // Developer can configure accessory at here (like setup event handler).
  // Update current value.
  configureAccessory(accessory) {
    this.log(
      'Configuring cached accessory [%s]',
      accessory.displayName,
      accessory.context.deviceId,
      accessory.UUID
    );

    // Set the accessory to reachable if plugin can currently process the accessory,
    // otherwise set to false and update the reachability later by invoking
    // accessory.updateReachability()
    accessory.reachable = true;

    accessory.on('identify', function(paired, callback) {
      this.log.debug('[IDENTIFY][%s]', accessory.displayName);
      callback();
    });

    this.accessories.set(accessory.UUID, accessory);
  }

  updateAccessoryReachability(accessory, state) {
    this.log('Update Reachability [%s]', accessory.displayName, state);
    accessory.updateReachability(state);
  }

  // Sample function to show how developer can remove accessory dynamically from outside event
  removeAccessory(accessory) {
    this.log('Remove Accessory [%s]', accessory.displayName);
    this.api.unregisterPlatformAccessories(
      'homebridge-tuya-web',
      'TuyaWebPlatform',
      [accessory]
    );

    this.accessories.delete(accessory.uuid);
  }
}
