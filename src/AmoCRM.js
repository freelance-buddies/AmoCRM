'use strict';
import EventResource from './base/EventResource';
import AmoConnection from './base/AmoConnection';
import PrivateDomainRequest from './base/requests/domain/PrivateDomainRequest';
import ResourceFactoryBuilder from './base/ResourceFactoryBuilder';

class AmoCRM extends EventResource {

  constructor( options ) {
    super();
    if ( !options ) {
      throw new Error( 'Wrong configuration' );
    }
    this._options = options;
    this._request = new PrivateDomainRequest( options.domain );
    this._connection = new AmoConnection( this._request, options.auth );

    this.registerEvents();
    this.assignFactories();
  }

  registerEvents() {

    this.proxyEventHandlers( 'connection', AmoConnection.EVENTS, this._connection );
    this._connection.on( 'error', ( ...args ) =>
      this.triggerEvent( 'error', ...args )
    );
  }

  assignFactories() {
    const builder = new ResourceFactoryBuilder( this._request ),
      factories = builder.getResourceFactories();
    Object.assign( this, factories );
  }

  get request() {
    return {
      get: ( ...args ) => this._request.get( ...args ),
      post: ( ...args ) => this._request.post( ...args )
    };
  }

  get connection() {
    return this._connection;
  }

  connect() {
    return this._connection.connect();
  }
}

module.exports = AmoCRM;
