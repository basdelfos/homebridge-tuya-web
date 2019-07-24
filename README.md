# homebridge-tuya-web
Homebridge plugin for Tuya devices using a cloud Tuya Web Api.

This Homebridge plugin is based on the Home Assistent Tuya integration that implements a special Tuya Home Assistant API. 
See (https://www.home-assistant.io/components/tuya/) and (https://github.com/PaulAnnekov/tuyaha).

## Features
This Homebridge Plugin implements the following features:
- Controlling Tuya WIFI enabled devices form within HomeKit enabled iOS Apps.
- Uses simple and lightweight Cloud Web API to control and get state update from Tuya devices. You will need a stable internet connection to control the devices and get frequent state updates.
- Device State Caching. State of devices is cached in memory, every time a HomeKit app request status updates from the devices this results in a very fast and responsive response. State cache is updated every 10 seconds and when controled from a HomeKit app. There can be a latancy in updates when a device is controled form an App/Hub/Controller other than HomeKit, e.g. from the Tuya Android/iOS App.

## Installation

```
npm i homebridge-tuya-web -g
```

## Basic config.json

```javascript
{
  "platform": "TuyaWebPlatform",
  "name": "TuyaWebPlatform",
  "options": [
    {
      "username": "xxxx@gmail.com",
      "password": "xxxxxxxxxx",
      "countryCode": "xx",
      "platform": "smart_life"
    }
  ]
}
```

The `options` has these properties:

- `username`: Required. The username for the account that is registered in the Android/iOS App.
- `password`: Required. The password for the account that is registered in the Android/iOS App.
- `countryCode`: Required. Your account country code (https://www.countrycode.org/), e.g., 1 for USA or 86 for China.
- `plaform`: The App where your account is registered. `tuya` for Tuya Smart, `smart_life` for Smart Life, `jinvoo_smart` for Jinvoo Smart. Defaults to `tuya`.

## Supported device types

There is currently support for the following device types within this Homebridge plugin:

- **Switch/Outlet** - The platform supports switch and outlets/sockets.
- **Light/Dimmer** - The platform supports most kinds of Tuya light. Party implemented, now only supports controlling on/off and brightness. This can be used with a dimmer.

The used Web API also supports these devices, but are not implemented yet in the plugin.
- **Climate** - Not yet supported.
- **Cover** - Not yet supported.
- **Fan** - Not yet supported.
- **Scene** - Not supported, don't see the use of this as scenes are configured in HomeKit. Will probably never implement this.

## TODO
These features are on my wishlist and need to be implemented:
- Implement devices that are not supported yet.
- Add option to enable/disable state caching.
- Add option to change polling frequency to user defined value (default is now 10 seconds).

## Unit tests
The source code also has some unit tests to test API calls. Run the following command to run the unit tests.

```
> mocha test/tuyawebapi_test.js
```



