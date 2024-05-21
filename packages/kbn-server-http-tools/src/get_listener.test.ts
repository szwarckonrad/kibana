/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getServerTLSOptionsMock,
  createHttpServerMock,
  createHttpsServerMock,
} from './get_listener.test.mocks';
import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import type { IHttpConfig } from './types';
import { getServerListener } from './get_listener';

const createConfig = (parts: Partial<IHttpConfig>): IHttpConfig => ({
  host: 'localhost',
  port: 5601,
  socketTimeout: 120000,
  keepaliveTimeout: 120000,
  payloadTimeout: 20000,
  shutdownTimeout: moment.duration(30, 'seconds'),
  maxPayload: ByteSizeValue.parse('1048576b'),
  ...parts,
  cors: {
    enabled: false,
    allowCredentials: false,
    allowOrigin: ['*'],
    ...parts.cors,
  },
  ssl: {
    enabled: false,
    ...parts.ssl,
  },
  restrictInternalApis: false,
});

describe('getServerListener', () => {
  beforeEach(() => {
    getServerTLSOptionsMock.mockReset();
    createHttpServerMock.mockClear();
    createHttpsServerMock.mockClear();
  });

  describe('when TLS is enabled', () => {
    it('calls getServerTLSOptions with the correct parameters', () => {
      const config = createConfig({ ssl: { enabled: true } });

      getServerListener(config);

      expect(getServerTLSOptionsMock).toHaveBeenCalledTimes(1);
      expect(getServerTLSOptionsMock).toHaveBeenCalledWith(config.ssl);
    });

    it('calls https.createServer with the correct parameters', () => {
      const config = createConfig({ ssl: { enabled: true } });

      getServerTLSOptionsMock.mockReturnValue({ stub: true });

      getServerListener(config);

      expect(createHttpsServerMock).toHaveBeenCalledTimes(1);
      expect(createHttpsServerMock).toHaveBeenCalledWith({
        stub: true,
        keepAliveTimeout: config.keepaliveTimeout,
      });
    });

    it('properly configures the listener', () => {
      const config = createConfig({ ssl: { enabled: true } });
      const server = getServerListener(config);

      expect(server.setTimeout).toHaveBeenCalledTimes(1);
      expect(server.setTimeout).toHaveBeenCalledWith(config.socketTimeout);

      expect(server.on).toHaveBeenCalledTimes(2);
      expect(server.on).toHaveBeenCalledWith('clientError', expect.any(Function));
      expect(server.on).toHaveBeenCalledWith('timeout', expect.any(Function));
    });

    it('returns the https server', () => {
      const config = createConfig({ ssl: { enabled: true } });

      const server = getServerListener(config);

      const expectedServer = createHttpsServerMock.mock.results[0].value;

      expect(server).toBe(expectedServer);
    });
  });

  describe('when TLS is disabled', () => {
    it('does not call getServerTLSOptions', () => {
      const config = createConfig({ ssl: { enabled: false } });

      getServerListener(config);

      expect(getServerTLSOptionsMock).not.toHaveBeenCalled();
    });

    it('calls http.createServer with the correct parameters', () => {
      const config = createConfig({ ssl: { enabled: false } });

      getServerTLSOptionsMock.mockReturnValue({ stub: true });

      getServerListener(config);

      expect(createHttpServerMock).toHaveBeenCalledTimes(1);
      expect(createHttpServerMock).toHaveBeenCalledWith({
        keepAliveTimeout: config.keepaliveTimeout,
      });
    });

    it('properly configures the listener', () => {
      const config = createConfig({ ssl: { enabled: false } });
      const server = getServerListener(config);

      expect(server.setTimeout).toHaveBeenCalledTimes(1);
      expect(server.setTimeout).toHaveBeenCalledWith(config.socketTimeout);

      expect(server.on).toHaveBeenCalledTimes(2);
      expect(server.on).toHaveBeenCalledWith('clientError', expect.any(Function));
      expect(server.on).toHaveBeenCalledWith('timeout', expect.any(Function));
    });

    it('returns the http server', () => {
      const config = createConfig({ ssl: { enabled: false } });

      const server = getServerListener(config);

      const expectedServer = createHttpServerMock.mock.results[0].value;

      expect(server).toBe(expectedServer);
    });
  });
});
