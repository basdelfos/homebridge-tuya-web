export type TuyaDevice = {
  data: {
    online: boolean;
    state: number | string | boolean;
    color_mode?: string;
    percentage?: number;
    brightness?: number;
    support_stop?: boolean;
    color?: {
      brightness?: number;
      saturation?: number;
      hue?: number;
    };
  };
  name: string;
  icon: string;
  id: string;
  dev_type: string;
  ha_type: string;
};

export type PlatformAccessory = any;
