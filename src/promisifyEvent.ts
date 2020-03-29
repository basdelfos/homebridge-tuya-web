import {
  CharacteristicValue,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
} from 'hap-nodejs';

type Callback = (data: any) => void;

export const pifyGetEvt = (evt: () => Promise<CharacteristicValue>) => (
  callback: CharacteristicGetCallback<CharacteristicValue>
) => {
  evt()
    .then(data => {
      callback(null, data);
    })
    .catch(err => {
      callback(err);
    });
};

export const pifySetEvt = (
  evt: (data: CharacteristicValue) => Promise<void>
) => (data: CharacteristicValue, callback: CharacteristicSetCallback) => {
  evt(data)
    .then(data => {
      callback(null);
    })
    .catch(err => {
      callback(err);
    });
};
