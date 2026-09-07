import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TelemtAPI } from '@aezakmiproject/telemt-sdk';
import { TELEMT_CLIENT, TELEMT_MODULE_OPTIONS } from './telemt.constants';
import {
  TelemtModuleAsyncOptions,
  TelemtModuleOptions,
  TelemtOptionsFactory,
} from './telemt.interfaces';
import { TelemtService } from './telemt.service';

const clientProvider: Provider = {
  provide: TELEMT_CLIENT,
  useFactory: (options: TelemtModuleOptions) => new TelemtAPI(options),
  inject: [TELEMT_MODULE_OPTIONS],
};

@Module({})
export class TelemtModule {
  static forRoot(options: TelemtModuleOptions): DynamicModule {
    return {
      module: TelemtModule,
      providers: [
        { provide: TELEMT_MODULE_OPTIONS, useValue: options },
        clientProvider,
        TelemtService,
      ],
      exports: [TelemtService],
      global: false,
    };
  }

  static forRootAsync(options: TelemtModuleAsyncOptions): DynamicModule {
    return {
      module: TelemtModule,
      imports: options.imports ?? [],
      providers: [
        ...this.createAsyncOptionsProviders(options),
        clientProvider,
        TelemtService,
      ],
      exports: [TelemtService],
      global: false,
    };
  }

  private static createAsyncOptionsProviders(
    options: TelemtModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: TELEMT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: TELEMT_MODULE_OPTIONS,
          useFactory: (factory: TelemtOptionsFactory) =>
            factory.createTelemtOptions(),
          inject: [options.useClass],
        },
        { provide: options.useClass, useClass: options.useClass },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: TELEMT_MODULE_OPTIONS,
          useFactory: (factory: TelemtOptionsFactory) =>
            factory.createTelemtOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    throw new Error(
      'TelemtModule.forRootAsync requires one of useFactory, useClass, or useExisting',
    );
  }
}