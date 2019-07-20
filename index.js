const SwitchAccessory = require('lib/switch_accessory');

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("homebridge-tuya-web", "TuyaWebPlatform", TuyaWebPlatform, true);
}

class TuyaWebPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;

    this.accessories = new Map();

    // Create instance of TuyaDiscover
    this.discovery = new TuyaWebDiscover(this.log, this.config.devices);

    if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on('didFinishLaunching', function () {
        this.log("Initializing TuyaWebPlatform...");

        // Create Tuya Web API instance
        this.tuyaWebApi = new TuyaWebApi(
          'b.delfos@gmail.com',
          'yfrHt*?{dh57<~',
          31,
          'smart_life'
        );

        // Get access token
        api.getOrRefreshToken().then((token) => {
          this.tuyaWebApi.token = token;

          // Start discovery for devices
          this.discovery.startDiscovery().then((devices) => {
            // Add devices to Homebridge
            for (device in devices) {
              addAccessory(device);
            }
          });
        });

      }.bind(this));
    }

    // // When a new device is found, add it to Homebridge
    // this.discovery.on('device-new', device => {
    //   this.log.info('New Device Online: %s (%s)', device.name || 'unnamed', device.id);
    //   this.addAccessory(device);
    // });

    // // If a device is unreachable, remove it from Homebridge
    // this.discovery.on('device-offline', device => {
    //   this.log.info('Device Offline: %s (%s)', device.name || 'unnamed', device.id);

    //   const uuid = this.api.hap.uuid.generate(device.id);
    //   this.removeAccessory(this.accessories.get(uuid));
    // });
  }

  addAccessory(device) {
    const deviceType = device.dev_type || 'switch';
    this.log.info('Adding: %s (%s / %s)', device.name || 'unnamed', deviceType, device.id);

    // Get UUID
    const uuid = knownUUId || this.api.hap.uuid.generate(device.id);
    const homebridgeAccessory = this.accessories.get(uuid);

    // Construct new accessory
    let deviceAccessory;
    switch (deviceType) {
      case 'light':
        // deviceAccessory = new LightAccessory(this, homebridgeAccessory, device);
        break;
      case 'switch':
      default:
        deviceAccessory = new SwitchAccessory(this, homebridgeAccessory, device);
        break;
    }

    // Add to global map
    this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
  }

  // Function invoked when homebridge tries to restore cached accessory.
  // Developer can configure accessory at here (like setup event handler).
  // Update current value.
  configureAccessory(accessory) {
    this.log("Configure Accessory [%s]", accessory.displayName);

    // Set the accessory to reachable if plugin can currently process the accessory,
    // otherwise set to false and update the reachability later by invoking 
    // accessory.updateReachability()
    accessory.reachable = true;

    accessory.on('identify', function (paired, callback) {
      this.log("Identify [%s]", accessory.displayName);
      callback();
    });

    // TODO --> create instance of device specific class

    // if (accessory.getService(Service.Lightbulb)) {
    //   accessory.getService(Service.Lightbulb)
    //     .getCharacteristic(Characteristic.On)
    //     .on('set', function (value, callback) {
    //       platform.log(accessory.displayName, "Light -> " + value);
    //       callback();
    //     });
    // }

    this.accessories.add(accessory.uuid, accessory);
  }

  updateAccessoriesReachability(accessory) {
    this.log("Update Reachability [%s]", accessory.displayName);
    accessory.updateReachability(false);
  }

  // Sample function to show how developer can remove accessory dynamically from outside event
  removeAccessory(accessory) {
    this.log("Remove Accessory [%s]", accessory.displayName);
    this.api.unregisterPlatformAccessories("homebridge-tuya-web", "TuyaWebPlatform", [accessory]);

    this.accessories.delete(accessory.uuid);
  }
}


