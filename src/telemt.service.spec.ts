import { Test } from '@nestjs/testing';
import type { TelemtAPI } from '@aezakmiproject/telemt-sdk';
import type { ISdkResponse } from '@aezakmiproject/telemt-sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { TELEMT_CLIENT } from './telemt.constants';
import { TelemtApiException } from './telemt.exception';
import { TelemtService } from './telemt.service';

/** The service only forwards these, so identity-comparable stubs are enough. */
const SERVICE_GETTERS = [
  'users',
  'config',
  'system',
  'health',
  'stats',
  'runtime',
  'security',
  'limits',
] as const;

function createApiStub() {
  return Object.fromEntries(
    SERVICE_GETTERS.map((name) => [name, { __service: name }]),
  ) as unknown as TelemtAPI;
}

describe('TelemtService', () => {
  let api: TelemtAPI;
  let service: TelemtService;

  beforeEach(async () => {
    api = createApiStub();

    const moduleRef = await Test.createTestingModule({
      providers: [TelemtService, { provide: TELEMT_CLIENT, useValue: api }],
    }).compile();

    service = moduleRef.get(TelemtService);
  });

  it('is resolvable through Nest DI with the TELEMT_CLIENT token', () => {
    expect(service).toBeInstanceOf(TelemtService);
  });

  it('exposes the injected client as-is', () => {
    expect(service.client).toBe(api);
  });

  describe('sub-service getters', () => {
    it.each(SERVICE_GETTERS)('forwards .%s to the client', (name) => {
      expect(service[name]).toBe(api[name]);
    });

    it('reads through to the client on every access rather than caching', () => {
      const replacement = { __service: 'users-v2' };
      (api as unknown as Record<string, unknown>).users = replacement;

      expect(service.users).toBe(replacement);
    });
  });

  describe('unwrap', () => {
    it('returns data from a successful response', async () => {
      const data = { id: 1, name: 'alice' };
      const res: ISdkResponse<typeof data> = { isOk: true, data };

      await expect(service.unwrap(res)).resolves.toBe(data);
    });

    it('accepts a promise of a response', async () => {
      const data = ['a', 'b'];
      const res: ISdkResponse<string[]> = { isOk: true, data };

      await expect(service.unwrap(Promise.resolve(res))).resolves.toBe(data);
    });

    it('returns undefined for a successful response that carries no data', async () => {
      await expect(service.unwrap({ isOk: true })).resolves.toBeUndefined();
    });

    it('preserves falsy payloads instead of treating them as missing', async () => {
      await expect(service.unwrap({ isOk: true, data: 0 })).resolves.toBe(0);
      await expect(service.unwrap({ isOk: true, data: false })).resolves.toBe(
        false,
      );
      await expect(service.unwrap({ isOk: true, data: '' })).resolves.toBe('');
    });

    it('throws TelemtApiException carrying code, message and requestId on failure', async () => {
      const res: ISdkResponse<never> = {
        isOk: false,
        code: 'user_not_found',
        message: 'No such user',
        requestId: 99,
      };

      await expect(service.unwrap(res)).rejects.toThrow(TelemtApiException);
      await expect(service.unwrap(res)).rejects.toMatchObject({
        code: 'user_not_found',
        message: 'No such user',
        requestId: 99,
      });
    });

    it('throws for a transport failure that has no requestId', async () => {
      const res: ISdkResponse<never> = {
        isOk: false,
        code: 'sdk_network_error',
      };

      const error = await service.unwrap(res).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TelemtApiException);
      expect(error).toMatchObject({
        code: 'sdk_network_error',
        message: 'Telemt API call failed (sdk_network_error)',
        requestId: undefined,
      });
    });

    it('throws on failure even when data is present', async () => {
      const res: ISdkResponse<string> = {
        isOk: false,
        code: 'conflict',
        message: 'Conflict',
        data: 'partial',
      };

      await expect(service.unwrap(res)).rejects.toThrow(TelemtApiException);
    });

    it('propagates a rejected promise untouched', async () => {
      const boom = new Error('socket hang up');

      await expect(service.unwrap(Promise.reject(boom))).rejects.toBe(boom);
    });
  });
});
