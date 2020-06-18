import {
  Accessory,
  Service,
  Characteristic,
  CharacteristicValue,
} from 'hap-nodejs';
import { TuyaDevice } from './types';

export abstract class BaseAccessory {
  public deviceId: string;
  public log: any;
  public cachedState: Map<string, CharacteristicValue> = new Map();
  public validCache: boolean = false;
  public serviceType: typeof Service;
  public service: Service;

  private PlatformAccessory;
  private UUIDGen: any;

  constructor(
    public platform,
    public homebridgeAccessory,
    public deviceConfig: TuyaDevice,
    public categoryType
  ) {
    this.deviceId = deviceConfig.id;
    this.categoryType = categoryType;

    this.PlatformAccessory = platform.api.platformAccessory;

    this.UUIDGen = platform.api.hap.uuid;

    this.log = platform.log;
    this.homebridgeAccessory = homebridgeAccessory;
    this.deviceConfig = deviceConfig;

    switch (categoryType) {
      case Accessory.Categories.LIGHTBULB:
        this.serviceType = Service.Lightbulb;
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
        homebridgeAccessory.UUID
      );
      this.homebridgeAccessory.displayName = this.deviceConfig.name;
    } else {
      this.log.info('Creating New Accessory %s', this.deviceConfig.id);
      this.homebridgeAccessory = new this.PlatformAccessory(
        this.deviceConfig.name,
        this.UUIDGen.generate(this.deviceConfig.id),
        categoryType
      );
      this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      this.homebridgeAccessory.controller = this;
      this.platform.registerPlatformAccessory(this.homebridgeAccessory);
    }

    // Create service
    this.service = this.homebridgeAccessory.getService(this.serviceType);
    if (this.service) {
      this.service.setCharacteristic(
        Characteristic.Name,
        this.deviceConfig.name
      );
    } else {
      this.log.debug('Creating New Service %s', this.deviceConfig.id);
      this.service = this.homebridgeAccessory.addService(
        this.serviceType,
        this.deviceConfig.name
      );
    }

    this.homebridgeAccessory.on('identify', (paired, callback) => {
      this.log.debug('[IDENTIFY][%s]', this.homebridgeAccessory.displayName);
      callback();
    });
  }

  abstract async updateState(data: TuyaDevice['data']): Promise<void>;

  updateAccessory(device: TuyaDevice) {
    // Update general accessory information
    if (device.name) {
      this.homebridgeAccessory.displayName = device.name;
      this.homebridgeAccessory._associatedHAPAccessory.displayName =
        device.name;
      var accessoryInformationService =
        this.homebridgeAccessory.getService(Service.AccessoryInformation) ||
        this.homebridgeAccessory.addService(Service.AccessoryInformation);
      var characteristicName =
        accessoryInformationService.getCharacteristic(Characteristic.Name) ||
        accessoryInformationService.addCharacteristic(Characteristic.Name);
      if (characteristicName) {
        characteristicName.setValue(device.name);
      }
    }
    if (device.data && device.data.online) {
      this.homebridgeAccessory.updateReachability(device.data.online);
    }
    // Update device specific state
    this.updateState(device.data);
  }

  getServiceType() {
    return this.serviceType;
  }

  getCategoryType() {
    return this.categoryType;
  }

  setCachedState(characteristic, value) {
    this.cachedState.set(characteristic, value);
    this.validCache = true;
  }

  getCachedState(characteristic) {
    return this.cachedState.get(characteristic);
  }

  hasValidCache() {
    return this.validCache && this.cachedState.size > 0;
  }

  invalidateCache() {
    this.validCache = false;
  }
}
