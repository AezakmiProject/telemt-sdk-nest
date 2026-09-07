# @aezakmiproject/telemt-sdk-nest

[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](package.json)

NestJS module for the [Telemt](https://github.com/telemt/telemt) Control API.

Wraps [`@aezakmiproject/telemt-sdk`](https://www.npmjs.com/package/@aezakmiproject/telemt-sdk) in an injectable provider: one configured `TelemtAPI` per registration, resolved through Nest DI, with sync and async registration and an opt-in helper that turns the SDK's no-throw envelope into a thrown exception.

Requires **Node.js 22.12+**. `@nestjs/common` v12 is ESM-only while this package is published as CommonJS, so it relies on `require(esm)`, which is unflagged only from that version.

This project is an independent open-source client. It is not affiliated with Telegram or the Telemt authors.

## Install

This package declares its runtime dependencies as peers, so install the SDK alongside it:

```bash
npm install @aezakmiproject/telemt-sdk-nest @aezakmiproject/telemt-sdk
# or
pnpm add @aezakmiproject/telemt-sdk-nest @aezakmiproject/telemt-sdk
```

The full peer set is:

| Peer | Range | Notes |
| --- | --- | --- |
| `@aezakmiproject/telemt-sdk` | `^1.2.0` | The client this module wraps — install it explicitly |
| `@nestjs/common` | `^12.0.0` | Already present in any Nest application |
| `reflect-metadata` | `^0.2.0` | Already present in any Nest application |

Keeping the SDK a peer means your application owns its version, and the module does
not pin a second copy of the client into your tree.

## Quick start

Register the module once, then inject `TelemtService` anywhere.

```ts
import { Module } from '@nestjs/common';
import { TelemtModule } from '@aezakmiproject/telemt-sdk-nest';

@Module({
  imports: [
    TelemtModule.forRoot({
      apiUrl: 'http://127.0.0.1:9091',
      auth: 'telemt-sdk-dev-token', // exact value of [server.api].auth_header
    }),
  ],
})
export class AppModule {}
```

```ts
import { Injectable } from '@nestjs/common';
import { TelemtService } from '@aezakmiproject/telemt-sdk-nest';

@Injectable()
export class UsersReport {
  constructor(private readonly telemt: TelemtService) {}

  async listUsernames(): Promise<string[]> {
    const users = await this.telemt.unwrap(this.telemt.users.getAll());
    return users.map((user) => user.username);
  }
}
```

`auth` is sent verbatim as the `Authorization` header. Telemt does a constant-time string comparison rather than Bearer/OAuth parsing — do not prefix `Bearer ` unless that prefix is literally part of `auth_header`.

## Async registration

Use `forRootAsync` when the options come from config, a secret store, or anything else resolved at boot. Exactly one of `useFactory`, `useClass`, or `useExisting` is required; passing none throws at module-construction time.

### useFactory

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelemtModule } from '@aezakmiproject/telemt-sdk-nest';

TelemtModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    apiUrl: config.getOrThrow<string>('TELEMT_API_URL'),
    auth: config.getOrThrow<string>('TELEMT_AUTH'),
  }),
});
```

The factory may be `async`; the client is not constructed until it resolves.

### useClass

```ts
import { Injectable } from '@nestjs/common';
import {
  TelemtModule,
  type TelemtModuleOptions,
  type TelemtOptionsFactory,
} from '@aezakmiproject/telemt-sdk-nest';

@Injectable()
export class TelemtConfig implements TelemtOptionsFactory {
  async createTelemtOptions(): Promise<TelemtModuleOptions> {
    return { apiUrl: process.env.TELEMT_API_URL!, auth: await readSecret() };
  }
}

TelemtModule.forRootAsync({ useClass: TelemtConfig });
```

`useClass` is instantiated by this module, so the class does not need to be provided anywhere else.

### useExisting

Reuse a provider the host application already owns, rather than getting a second instance:

```ts
TelemtModule.forRootAsync({
  imports: [TelemtConfigModule], // must export TelemtConfig
  useExisting: TelemtConfig,
});
```

## `TelemtService`

Thin, stateless facade over the underlying `TelemtAPI`. Each getter forwards to the client on every access.

| Member | What it covers |
| --- | --- |
| `users` | CRUD, enable/disable, rotate secret, reset quota |
| `config` | Read / merge-patch `config.toml` |
| `system` | Build info, reload, `waitForReload` |
| `health` | Liveness and readiness |
| `stats` | Counters, upstreams, DCs, ME writers |
| `runtime` | Gates, ME pool/quality, events, TLS fingerprints |
| `security` | API posture and IP whitelist |
| `limits` | Effective timeouts / pool / per-user limits |
| `client` | The raw `TelemtAPI`, for anything not surfaced above |
| `unwrap(res)` | Returns `data`, or throws `TelemtApiException` |

The full method list and request/response types live in the [SDK's API reference](https://github.com/AezakmiProject/telemt-sdk/blob/main/docs/api.md).

## Responses and `unwrap`

SDK methods never throw. Every call returns a flat envelope, and transport failures arrive there too, under an `sdk_*` code:

```ts
interface ISdkResponse<T> {
  isOk: boolean;
  data?: T;
  code?: TelemtErrorCode;
  message?: string;
  revision?: string;   // success only — SHA-256 of config.toml
  requestId?: number;  // Telemt-side errors only
}
```

Checking `isOk` by hand keeps that behaviour:

```ts
const res = await this.telemt.users.getAll();
if (!res.isOk) {
  throw new Error(`${res.code}: ${res.message}`);
}
// `data` is still `UserInfo[] | undefined` here — see the narrowing note below
return (res.data ?? []).map((user) => user.username);
```

`ISdkResponse` is not a discriminated union, so testing `isOk` does **not** narrow `data`; under `strict` you still have to handle the `undefined`. `unwrap` exists to collapse that:

```ts
const users = await this.telemt.unwrap(this.telemt.users.getAll());
// users is UserInfo[] — the failure branch has already thrown, and it narrows
```

It accepts either a response or a promise of one, and on `isOk: false` throws `TelemtApiException`:

```ts
class TelemtApiException extends Error {
  readonly code?: string;      // server or `sdk_*` code
  readonly requestId?: number; // Telemt-side errors only, absent on transport failures
}
```

Note that `unwrap` throws whenever `isOk` is false, even if the response also carries partial `data`.

A `202` from a user mutation is still `isOk: true` — the write is on disk, but check `UserInfo.in_runtime` (or call `system.reload()`) before treating the user as live.

## Scope

Each registration builds its own client, so registering the module in two places gives two independent `TelemtAPI` instances. The module is **not** global: every consuming module must import it, and only `TelemtService` is exported — `TELEMT_CLIENT` and `TELEMT_MODULE_OPTIONS` stay internal to the module.

WEB-proxy session control (`api.web`) is not implemented in the SDK, so it is deliberately not surfaced here.

## Development

```bash
pnpm install
pnpm test        # vitest, unit tests
pnpm test:cov    # with V8 coverage
pnpm typecheck   # tsc, sources + specs
pnpm build       # tsc -> dist/
```

Tests run on [Vitest](https://vitest.dev) rather than Jest because this project pins `typescript@7` (the native compiler), which no longer ships the JS compiler API `ts-jest` needs. See [docs/decisions.md](docs/decisions.md).

## License

[ISC](LICENSE)
