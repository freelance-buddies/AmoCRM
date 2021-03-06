'use strict';

import schema from '../apiUrls.js';
import EventResource from './EventResource';

class AmoConnection extends EventResource {

  static EVENTS = [
    'beforeReconnect',
    'beforeConnect',
    'authError',
    'connected',
    'error'
  ];

  constructor( request, options = {}) {
    super();
    this._request = request;
    this._options = options;
    this._isConnected = false;
    this._reconnectOptions = Object.assign({ disabled: false }, options.reconnection );
  }

  get connected() {
    return this._isConnected;
  }

  reconnectAt( date, delay = 60 * 1000, accuracyTime = 60 * 1000 ) {
    delete this._reconnectTimeout;

    let timeout;
    const self = this,
      onReconnect = new Promise( function check( resolve, reject ) {
        if ( self._reconnectTimeout !== timeout ) {
          return reject();
        }

        timeout = setTimeout(() => {
          const now = new Date;

          if ( now > date - accuracyTime ) {
            return resolve();
          }

          check( resolve, reject );
        }, delay );

        self._reconnectTimeout = timeout;
      });

    return onReconnect.then(() => {
      this.triggerEvent( 'beforeReconnect', true );
      return this.connect();
    });
  }

  connect() {
    if ( this._isConnected ) {
      return Promise.resolve( true );
    }
    const { login, password, hash } = this._options,
      reconnection = this._reconnectOptions,
      { checkDelay, accuracyTime } = reconnection,
      data = {
        USER_LOGIN: login
      };

    if ( hash ) {
      data[ 'USER_HASH' ] = hash;
    } else if ( password ) {
      data[ 'USER_PASSWORD' ] = password;
    }

    this.triggerEvent( 'beforeConnect', this );

    return this._request.post( schema.auth, data, {
      headers: { 'Content-Type': 'application/json' },
      response: {
        dataType: 'json',
        saveCookies: true
      }
    })
      .then( data => {
        if ( !reconnection.disabled ) {
          this.reconnectAt( this._request.expires, checkDelay, accuracyTime );
        }

        this._isConnected = data.response.auth === true;

        if ( this._isConnected ) {
          this.triggerEvent( 'connected', this );
          return true;
        }

        const e = new Error( 'Auth Error' );
        e.data = data.response;

        this.triggerEvent( 'authError', e, this );
        this.triggerEvent( 'error', e, this );

        return false;
      })
      .catch( e => {
        this.triggerEvent( 'error', e, this );

        throw e;
      });
  }
}
module.exports = AmoConnection;
