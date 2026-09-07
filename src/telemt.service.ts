import { Inject, Injectable } from '@nestjs/common';
import type { ISdkResponse, TelemtAPI } from '@aezakmiproject/telemt-sdk';
import { TELEMT_CLIENT } from './telemt.constants';
import { TelemtApiException } from './telemt.exception';

@Injectable()
export class TelemtService {
  constructor(@Inject(TELEMT_CLIENT) private readonly api: TelemtAPI) {}

  get client(): TelemtAPI {
    return this.api;
  }

  get users() {
    return this.api.users;
  }

  get config() {
    return this.api.config;
  }

  get system() {
    return this.api.system;
  }

  get health() {
    return this.api.health;
  }

  get stats() {
    return this.api.stats;
  }

  get runtime() {
    return this.api.runtime;
  }

  get security() {
    return this.api.security;
  }

  get limits() {
    return this.api.limits;
  }

  /** Version-gated: requires Telemt 3.5.1+, see `WebService.MIN_VERSION`. */
  get web() {
    return this.api.web;
  }

  async unwrap<T>(response: Promise<ISdkResponse<T>> | ISdkResponse<T>): Promise<T> {
    const res = await response;
    if (!res.isOk) {
      throw new TelemtApiException(res.code, res.message, res.requestId);
    }
    return res.data as T;
  }
}