import { ModuleMetadata, Type } from '@nestjs/common';

export interface TelemtModuleOptions {
  apiUrl: string;
  auth: string;
}

export interface TelemtOptionsFactory {
  createTelemtOptions(): Promise<TelemtModuleOptions> | TelemtModuleOptions;
}

export interface TelemtModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<TelemtOptionsFactory>;
  useClass?: Type<TelemtOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<TelemtModuleOptions> | TelemtModuleOptions;
  inject?: any[];
}