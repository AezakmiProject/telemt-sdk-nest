import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TELEMT_CLIENT, TELEMT_MODULE_OPTIONS } from './telemt.constants';
import type {
  TelemtModuleOptions,
  TelemtOptionsFactory,
} from './telemt.interfaces';
import { TelemtModule } from './telemt.module';
import { TelemtService } from './telemt.service';

// The real SDK is never needed here: the module only has to construct *a*
// client with the resolved options. Mocking keeps this a unit test and keeps
// the SDK's network stack out of the process.
const { telemtApiCtor } = vi.hoisted(() => ({ telemtApiCtor: vi.fn() }));

vi.mock('@aezakmiproject/telemt-sdk', () => ({
  TelemtAPI: class {
    constructor(...args: unknown[]) {
      telemtApiCtor(...args);
    }
  },
}));

const OPTIONS: TelemtModuleOptions = {
  apiUrl: 'https://telemt.example/api',
  auth: 'secret-token',
};

describe('TelemtModule', () => {
  beforeEach(() => {
    telemtApiCtor.mockClear();
  });

  describe('forRoot', () => {
    it('returns a DynamicModule that exports only TelemtService', () => {
      const dynamicModule = TelemtModule.forRoot(OPTIONS);

      expect(dynamicModule.module).toBe(TelemtModule);
      expect(dynamicModule.exports).toEqual([TelemtService]);
      expect(dynamicModule.global).toBe(false);
    });

    it('registers the options, the client and the service', () => {
      const { providers = [] } = TelemtModule.forRoot(OPTIONS);

      expect(providers).toContainEqual({
        provide: TELEMT_MODULE_OPTIONS,
        useValue: OPTIONS,
      });
      expect(providers).toContain(TelemtService);
      expect(
        providers.some(
          (p) => typeof p === 'object' && 'provide' in p && p.provide === TELEMT_CLIENT,
        ),
      ).toBe(true);
    });

    it('wires a working TelemtService through Nest DI', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [TelemtModule.forRoot(OPTIONS)],
      }).compile();

      const service = moduleRef.get(TelemtService);

      expect(service).toBeInstanceOf(TelemtService);
      expect(service.client).toBe(moduleRef.get(TELEMT_CLIENT));
    });

    it('constructs the SDK client exactly once, with the given options', async () => {
      await Test.createTestingModule({
        imports: [TelemtModule.forRoot(OPTIONS)],
      }).compile();

      expect(telemtApiCtor).toHaveBeenCalledTimes(1);
      expect(telemtApiCtor).toHaveBeenCalledWith(OPTIONS);
    });

    it('does not leak TelemtService into a consumer that never imports it', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [TelemtModule.forRoot(OPTIONS)],
      }).compile();

      // Not global, so exports are the whole public surface.
      expect(() => moduleRef.get(TELEMT_MODULE_OPTIONS)).not.toThrow();
    });
  });

  describe('forRootAsync', () => {
    it('resolves options from useFactory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TelemtModule.forRootAsync({ useFactory: () => OPTIONS }),
        ],
      }).compile();

      expect(moduleRef.get(TELEMT_MODULE_OPTIONS)).toEqual(OPTIONS);
      expect(telemtApiCtor).toHaveBeenCalledWith(OPTIONS);
      expect(moduleRef.get(TelemtService)).toBeInstanceOf(TelemtService);
    });

    it('awaits an async useFactory before building the client', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          TelemtModule.forRootAsync({
            useFactory: async () => {
              await Promise.resolve();
              return OPTIONS;
            },
          }),
        ],
      }).compile();

      expect(moduleRef.get(TELEMT_MODULE_OPTIONS)).toEqual(OPTIONS);
      expect(telemtApiCtor).toHaveBeenCalledWith(OPTIONS);
    });

    it('passes injected dependencies into useFactory', async () => {
      @Injectable()
      class ConfigStub {
        readonly url = OPTIONS.apiUrl;
      }

      @Module({ providers: [ConfigStub], exports: [ConfigStub] })
      class ConfigStubModule {}

      const useFactory = vi.fn((config: ConfigStub) => ({
        apiUrl: config.url,
        auth: OPTIONS.auth,
      }));

      const moduleRef = await Test.createTestingModule({
        imports: [
          TelemtModule.forRootAsync({
            imports: [ConfigStubModule],
            inject: [ConfigStub],
            useFactory,
          }),
        ],
      }).compile();

      expect(useFactory).toHaveBeenCalledTimes(1);
      expect(useFactory.mock.calls[0][0]).toBeInstanceOf(ConfigStub);
      expect(moduleRef.get(TELEMT_MODULE_OPTIONS)).toEqual(OPTIONS);
    });

    it('instantiates and calls a useClass factory', async () => {
      const createTelemtOptions = vi.fn(() => OPTIONS);

      @Injectable()
      class OptionsFactory implements TelemtOptionsFactory {
        createTelemtOptions() {
          return createTelemtOptions();
        }
      }

      const moduleRef = await Test.createTestingModule({
        imports: [TelemtModule.forRootAsync({ useClass: OptionsFactory })],
      }).compile();

      expect(createTelemtOptions).toHaveBeenCalledTimes(1);
      // useClass must also be self-provided, not just injected.
      expect(moduleRef.get(OptionsFactory)).toBeInstanceOf(OptionsFactory);
      expect(moduleRef.get(TELEMT_MODULE_OPTIONS)).toEqual(OPTIONS);
      expect(telemtApiCtor).toHaveBeenCalledWith(OPTIONS);
    });

    it('reuses an already-provided factory with useExisting', async () => {
      const createTelemtOptions = vi.fn(async () => OPTIONS);

      @Injectable()
      class ExistingFactory implements TelemtOptionsFactory {
        createTelemtOptions() {
          return createTelemtOptions();
        }
      }

      @Module({ providers: [ExistingFactory], exports: [ExistingFactory] })
      class ExistingModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          TelemtModule.forRootAsync({
            imports: [ExistingModule],
            useExisting: ExistingFactory,
          }),
        ],
      }).compile();

      expect(createTelemtOptions).toHaveBeenCalledTimes(1);
      expect(moduleRef.get(TELEMT_MODULE_OPTIONS)).toEqual(OPTIONS);
      // The same instance the host module owns — not a second copy.
      expect(moduleRef.get(ExistingFactory).createTelemtOptions).toBeDefined();
    });

    it('prefers useFactory over useClass and useExisting when several are given', async () => {
      const fromClass = vi.fn(() => OPTIONS);

      @Injectable()
      class OptionsFactory implements TelemtOptionsFactory {
        createTelemtOptions() {
          return fromClass();
        }
      }

      const chosen: TelemtModuleOptions = { apiUrl: 'https://a', auth: 'b' };

      const moduleRef = await Test.createTestingModule({
        imports: [
          TelemtModule.forRootAsync({
            useFactory: () => chosen,
            useClass: OptionsFactory,
          }),
        ],
      }).compile();

      expect(moduleRef.get(TELEMT_MODULE_OPTIONS)).toEqual(chosen);
      expect(fromClass).not.toHaveBeenCalled();
    });

    it('defaults imports and inject to empty arrays', () => {
      const dynamicModule = TelemtModule.forRootAsync({
        useFactory: () => OPTIONS,
      });

      expect(dynamicModule.imports).toEqual([]);

      const optionsProvider = (dynamicModule.providers ?? []).find(
        (p) =>
          typeof p === 'object' &&
          'provide' in p &&
          p.provide === TELEMT_MODULE_OPTIONS,
      );

      expect(optionsProvider).toMatchObject({ inject: [] });
    });

    it('forwards the given imports onto the dynamic module', () => {
      @Module({})
      class SomeModule {}

      const dynamicModule = TelemtModule.forRootAsync({
        imports: [SomeModule],
        useFactory: () => OPTIONS,
      });

      expect(dynamicModule.imports).toEqual([SomeModule]);
    });

    it('exports only TelemtService and stays non-global', () => {
      const dynamicModule = TelemtModule.forRootAsync({
        useFactory: () => OPTIONS,
      });

      expect(dynamicModule.module).toBe(TelemtModule);
      expect(dynamicModule.exports).toEqual([TelemtService]);
      expect(dynamicModule.global).toBe(false);
    });

    it('throws when none of useFactory, useClass or useExisting is given', () => {
      expect(() => TelemtModule.forRootAsync({})).toThrowError(
        'TelemtModule.forRootAsync requires one of useFactory, useClass, or useExisting',
      );
    });
  });

  it('builds an independent client per registration', async () => {
    const other: TelemtModuleOptions = { apiUrl: 'https://other', auth: 'k2' };

    const [first, second] = await Promise.all([
      Test.createTestingModule({
        imports: [TelemtModule.forRoot(OPTIONS)],
      }).compile(),
      Test.createTestingModule({
        imports: [TelemtModule.forRoot(other)],
      }).compile(),
    ]);

    expect(telemtApiCtor).toHaveBeenCalledTimes(2);
    expect(telemtApiCtor).toHaveBeenCalledWith(OPTIONS);
    expect(telemtApiCtor).toHaveBeenCalledWith(other);
    expect(first.get(TELEMT_CLIENT)).not.toBe(second.get(TELEMT_CLIENT));
  });
});
