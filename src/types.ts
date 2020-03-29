export type TuyaDevice = {
  data: {
    support_stop: boolean;
    online: boolean;
    state: number | string;
  };
  name: string;
  icon: string;
  id: string;
  dev_type: string;
  ha_type: string;
};
