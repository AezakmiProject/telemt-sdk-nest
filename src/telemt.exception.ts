export class TelemtApiException extends Error {
  /** Server or `sdk_*` error code, if any (see telemt-sdk docs/errors.md). */
  public readonly code?: string;
  /** Present only for Telemt-side errors (not local/transport errors). */
  public readonly requestId?: number;

  constructor(code: string | undefined, message: string | undefined, requestId?: number) {
    super(message ?? `Telemt API call failed${code ? ` (${code})` : ''}`);
    this.name = 'TelemtApiException';
    this.code = code;
    this.requestId = requestId;
  }
}