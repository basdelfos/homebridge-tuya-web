const request = require('request');
const querystring = require('querystring');

class Token {
  constructor(accessToken, refreshToken, expiresOn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresOn = expiresOn;
  }
}

class TuyaWebApi {
  constructor(username, password, countryCode, tuyaPlaform = 'tuya') {
    this.username = username;
    this.password = password;
    this.countryCode = countryCode;
    this.tuyaPlaform = tuyaPlaform;

    // this.accessToken;
    // this.refreshToken;
    // this.tokenExpireTime = this.getCurrentEpoch();
    this.token = null;

    this.baseUrl = 'https://px1.tuyaeu.com';
  }

  discoverDevices() {
    if (!this.hasValidToken()) {
      throw new Error('No valid token');
    }

    var data = {
      'header': {
        'name': 'Discovery',
        'namespace': 'discovery',
        'payloadVersion': 1
      },
      'payload': {
        'accessToken': this.token.accessToken
      }
    }

    return new Promise((resolve, reject) => {
      this.sendRequestJson(
        this.baseUrl + '/homeassistant/skill',
        JSON.stringify(data),
        'GET',
        (response, obj) => {
          if (obj.payload && obj.payload.devices) {
            resolve(obj.payload.devices);
          }
        },
        (error) => {
          reject(error);
        }
      )
    });
  }

  getDeviceState(deviceId) {
    if (!this.hasValidToken()) {
      throw new Error('No valid token');
    }

    var data = {
      'header': {
        'name': 'QueryDevice',
        'namespace': 'query',
        'payloadVersion': 1
      },
      'payload': {
        'accessToken': this.token.accessToken,
        'devId': deviceId,
        'value': 1
      }
    }

    return new Promise((resolve, reject) => {
      this.sendRequestJson(
        this.baseUrl + '/homeassistant/skill',
        JSON.stringify(data),
        'GET',
        (response, obj) => {
          if (obj.payload && obj.header && obj.header.code === 'SUCCESS') {
            resolve(obj.payload.data);
          }
          else {
            reject(new Error('Invalid payload in response: ', obj))
          }
        },
        (error) => {
          reject(error);
        }
      )
    });
  }

  setDeviceState(deviceId, method, value) {
    if (!this.hasValidToken()) {
      throw new Error('No valid token');
    }

    /* Methods
     * turnOnOff -> 0 = off, 1 = on
    */

    var data = {
      'header': {
        'name': method,
        'namespace': 'control',
        'payloadVersion': 1
      },
      'payload': {
        'accessToken': this.token.accessToken,
        'devId': deviceId,
        'value': value
      }
    }

    return new Promise((resolve, reject) => {
      this.sendRequestJson(
        this.baseUrl + '/homeassistant/skill',
        JSON.stringify(data),
        'POST',
        (response, obj) => {
          if (obj.header && obj.header.code === 'SUCCESS') {
            resolve();
          }
          else {
            reject(new Error('Invalid payload in response: ', obj))
          }
        },
        (error) => {
          reject(error);
        }
      )
    });
  }

  getOrRefreshToken() {
    if (!this.username) {
      throw new Error('No username configured');
    }
    else {
      if (!this.password) {
        throw new Error('No password configured');
      }
      else {
        if (!this.countryCode) {
          throw new Error('No country code configured');
        }
        else {

          var form = {
            userName: this.username,
            password: this.password,
            countryCode: this.countryCode,
            bizType: this.tuyaPlaform,
            from: "tuya"
          }

          var formData = querystring.stringify(form);
          var contentLength = formData.length;

          return new Promise((resolve, reject) => {
            request({
              headers: {
                'Content-Length': contentLength,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              uri: this.baseUrl + '/homeassistant/auth.do',
              body: formData,
              method: 'POST'
            },
              (err, res, body) => {
                if (err) {
                  reject(new Error('Authentication fault, could not retreive token.', error));
                }
                else {
                  const obj = JSON.parse(body);
                  // Received token
                  var token = new Token(
                    obj['access_token'],
                    obj['refresh_token'],
                    this.getCurrentEpoch() + obj['expires_in']
                  );
                  resolve(token);
                }
              });
          });
        }
      }
    }
  }

  hasValidToken() {
    return this.token && this.token.accessToken && this.token.expiresOn > this.getCurrentEpoch();
  }

  /*
   * --------------------------------------
   * Utils
  */

  getCurrentEpoch() {
    return Math.round((new Date()).getTime() / 1000);
  }

  sendRequest(url, body, method, callbackSuccess, callbackError) {
    request({
      url: url,
      body: body,
      method: method,
      rejectUnauthorized: false,
    },
      (error, response, body) => {
        if (error) {
          callbackError(error);
        }
        else {
          callbackSuccess(response, body)
        }
      });
  }

  sendRequestJson(url, body, method, callbackSuccess, callbackError) {
    this.sendRequest(url, body, method,
      (response, body) => {
        try {
          const obj = JSON.parse(body);
          callbackSuccess(response, obj);
        }
        catch (error) {
          callbackError(new Error('Could not parse json. ', error));
        }
      },
      (error) => {
        callbackError(error);
      }
    );
  }
}

module.exports = TuyaWebApi;