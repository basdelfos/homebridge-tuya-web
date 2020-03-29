import request from 'request-promise';
import querystring from 'querystring';
import { TuyaDevice } from './types';

class Session {
  private expiresOn: number;
  private token: { expiresOn: number };

  constructor(
    public accessToken?: string,
    public refreshToken?: string,
    private expiresIn?: number,
    public areaCode?: string,
    public areaBaseUrl?: string
  ) {
    this.resetToken(accessToken, refreshToken, expiresIn);
  }

  resetToken(accessToken: string, refreshToken: string, expiresIn: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresOn = this._getCurrentEpoch() + expiresIn - 100; // subtract 100 ticks to expire token before it actually does
  }

  hasToken() {
    return this.accessToken && true;
  }

  isTokenExpired() {
    return this.token.expiresOn > this._getCurrentEpoch();
  }

  hasValidToken() {
    return this.accessToken && this.expiresOn > this._getCurrentEpoch();
  }

  _getCurrentEpoch() {
    return Math.round(new Date().getTime() / 1000);
  }
}

class TuyaWebApi {
  private session: Session;
  private authBaseUrl: string;

  constructor(
    private username: string,
    private password: string,
    private countryCode: string,
    private tuyaPlatform: string = 'tuya',
    private log = null
  ) {
    this.session = new Session();

    this.authBaseUrl = 'https://px1.tuyaeu.com';
  }

  async discoverDevices() {
    if (!this.session.hasValidToken()) {
      throw new Error('No valid token');
    }

    var data = {
      header: {
        name: 'Discovery',
        namespace: 'discovery',
        payloadVersion: 1,
      },
      payload: {
        accessToken: this.session.accessToken,
      },
    };

    const obj = await this.sendRequestJson<{
      devices: TuyaDevice[];
      scenes: {}[];
    }>(
      this.session.areaBaseUrl + '/homeassistant/skill',
      JSON.stringify(data),
      'GET'
    );

    if (obj.header && obj.header.code === 'SUCCESS') {
      if (obj.payload && obj.payload.devices) {
        return obj.payload.devices;
      }
    }
    throw new Error(`No valid response from API ${JSON.stringify(obj)}`);
  }

  getAllDeviceStates() {
    return this.discoverDevices();
  }

  async getDeviceState(deviceId: string) {
    if (!this.session.hasValidToken()) {
      throw new Error('No valid token');
    }

    var data = {
      header: {
        name: 'QueryDevice',
        namespace: 'query',
        payloadVersion: 1,
      },
      payload: {
        accessToken: this.session.accessToken,
        devId: deviceId,
        value: 1,
      },
    };

    const obj = await this.sendRequestJson<{
      data: {
        support_stop: boolean;
        online: boolean;
        state: number | string;
      };
    }>(
      this.session.areaBaseUrl + '/homeassistant/skill',
      JSON.stringify(data),
      'GET'
    );

    if (obj.payload && obj.header && obj.header.code === 'SUCCESS') {
      return obj.payload.data;
    } else {
      throw new Error(`Invalid payload in response: ${JSON.stringify(obj)}`);
    }
  }

  async setDeviceState(deviceId: string, method: string, payload: any) {
    if (!this.session.hasValidToken()) {
      throw new Error('No valid token');
    }

    /* Methods
     * turnOnOff -> 0 = off, 1 = on
     * brightnessSet --> 0..100
     */

    var data = {
      header: {
        name: method,
        namespace: 'control',
        payloadVersion: 1,
      },
      payload: payload,
    };

    data.payload.accessToken = this.session.accessToken;
    data.payload.devId = deviceId;

    const obj = await this.sendRequestJson(
      this.session.areaBaseUrl + '/homeassistant/skill',
      JSON.stringify(data),
      'POST'
    );
    if (!(obj.header && obj.header.code === 'SUCCESS')) {
      throw new Error(`Invalid payload in response: ${JSON.stringify(obj)}`);
    }
  }

  async getOrRefreshToken(): Promise<Session> {
    if (!this.session.hasToken()) {
      // No token, lets get a token from the Tuya Web API
      if (!this.username) {
        throw new Error('No username configured');
      } else {
        if (!this.password) {
          throw new Error('No password configured');
        } else {
          if (!this.countryCode) {
            throw new Error('No country code configured');
          } else {
            var form = {
              userName: this.username,
              password: this.password,
              countryCode: this.countryCode,
              bizType: this.tuyaPlatform,
              from: 'tuya',
            };

            var formData = querystring.stringify(form);
            var contentLength = formData.length;

            return new Promise((resolve, reject) => {
              request(
                {
                  headers: {
                    'Content-Length': contentLength,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  uri: this.authBaseUrl + '/homeassistant/auth.do',
                  body: formData,
                  method: 'POST',
                },
                (err, res, body) => {
                  if (err) {
                    reject(
                      new Error(
                        `Authentication fault, could not retreive token. ${err.toString()}`
                      )
                    );
                  } else {
                    let obj;
                    try {
                      obj = JSON.parse(body);
                    } catch (error) {
                      reject(
                        new Error(
                          `Could not parse json. Body: ${body} ${error}`
                        )
                      );
                    }
                    if (obj.responseStatus === 'error') {
                      reject(
                        new Error('Authentication fault: ' + obj.errorMsg)
                      );
                    } else {
                      // Received token
                      this.session.resetToken(
                        obj.access_token,
                        obj.refresh_token,
                        obj.expires_in
                      );
                      // Change url based on areacode in accesstoken first two chars
                      this.session.areaCode = obj.access_token.substr(0, 2);
                      switch (this.session.areaCode) {
                        case 'AY':
                          this.session.areaBaseUrl = 'https://px1.tuyacn.com';
                          break;
                        case 'EU':
                          this.session.areaBaseUrl = 'https://px1.tuyaeu.com';
                          break;
                        case 'US':
                        default:
                          this.session.areaBaseUrl = 'https://px1.tuyaus.com';
                      }
                      resolve(this.session);
                    }
                  }
                }
              );
            });
          }
        }
      }
    } else {
      if (this.session.hasToken() && this.session.isTokenExpired()) {
        // Refresh token

        const obj = JSON.parse(
          await this.sendRequest(
            this.session.areaBaseUrl +
              '/homeassistant/access.do?grant_type=refresh_token&refresh_token=' +
              this.session.refreshToken,
            '',
            'GET'
          )
        );
        this.session.resetToken(
          obj.access_token,
          obj.refresh_token,
          obj.expires_in
        );

        return this.session;
      }
    }
  }

  /*
   * --------------------------------------
   * HTTP methods
   */

  sendRequest(url: string, body: any, method: string) {
    return request({
      url: url,
      body: body,
      method: method,
      rejectUnauthorized: false,
    });
  }

  async sendRequestJson<payload extends any = null>(
    url: string,
    body: any,
    method: string
  ) {
    // this.log.debug(JSON.stringify(body));
    const result = await this.sendRequest(url, body, method);
    try {
      const obj = JSON.parse(result);
      return obj as {
        payload: payload;
        header: { code: string; payloadVersion: 1 };
      };
    } catch (err) {
      throw new Error(`Could not parse json. Body: ${result} ${err}`);
    }
  }
}

export default TuyaWebApi;
