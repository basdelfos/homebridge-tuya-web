const TuyaWebApi = require('./tuyawebapi');

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig, categoryType) {
    this.platform = platform;
    this.deviceId = deviceConfig.id;
    this.categoryType = categoryType;
    PlatformAccessory = platform.api.platformAccessory;

    ({ Accessory, Service, Characteristic, uuid: UUIDGen } = platform.api.hap);

    this.log = platform.log;
    this.homebridgeAccessory = homebridgeAccessory;
    this.deviceConfig = deviceConfig;

    this.serviceType;
    switch (categoryType) {
      case Accessory.Categories.LIGHTBULB:
        this.serviceType = Service.Lightbulb
        break;
      case Accessory.Categories.SWITCH:
        this.serviceType = Service.Switch;
        break;
        case Accessory.Categories.OUTLET:
          this.serviceType = Service.Outlet;
          break;
      case Accessory.Categories.FAN:
        this.serviceType = Service.Fanv2;
        break;
      default:
        this.serviceType = Service.AccessoryInformation;
    }

    // Retrieve existing of create new Bridged Accessory
    if (this.homebridgeAccessory) {
      this.homebridgeAccessory.controller = this;
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
        categoryType);
      this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      this.homebridgeAccessory.controller = this;
      this.platform.registerPlatformAccessory(this.homebridgeAccessory);
    }

    // Create service
    this.service = this.homebridgeAccessory.getService(this.serviceType);
    if (this.service) {
      this.service.setCharacteristic(Characteristic.Name, this.deviceConfig.name);
    }
    else {
      this.log.debug('Creating New Service %s', this.deviceConfig.id);
      this.service = this.homebridgeAccessory.addService(this.serviceType, this.deviceConfig.name);
    }

    this.homebridgeAccessory.on('identify', (paired, callback) => {
      this.log.debug('[IDENTIFY][%s]', this.homebridgeAccessory.displayName);
      callback();
    });
  }

  getServiceType() {
    return this.serviceType;
  }

  getCategoryType() {
    return this.categoryType;
  }
}

module.exports = BaseAccessory;