import { describe, expect, it } from 'vitest';
import { TelemtApiException } from './telemt.exception';

describe('TelemtApiException', () => {
  it('is a real Error with a stable name', () => {
    const err = new TelemtApiException('user_not_found', 'No such user', 42);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TelemtApiException);
    expect(err.name).toBe('TelemtApiException');
    expect(err.stack).toBeTruthy();
  });

  it('keeps code, message and requestId as given', () => {
    const err = new TelemtApiException('user_not_found', 'No such user', 42);

    expect(err.code).toBe('user_not_found');
    expect(err.message).toBe('No such user');
    expect(err.requestId).toBe(42);
  });

  it('falls back to a message that carries the code when message is missing', () => {
    const err = new TelemtApiException('sdk_network_error', undefined);

    expect(err.message).toBe('Telemt API call failed (sdk_network_error)');
    expect(err.code).toBe('sdk_network_error');
    expect(err.requestId).toBeUndefined();
  });

  it('falls back to a bare message when neither code nor message is given', () => {
    const err = new TelemtApiException(undefined, undefined);

    expect(err.message).toBe('Telemt API call failed');
    expect(err.code).toBeUndefined();
  });

  it('prefers an explicit message over the code fallback', () => {
    const err = new TelemtApiException('sdk_timeout', 'Request timed out');

    expect(err.message).toBe('Request timed out');
  });

  it('keeps an empty message rather than substituting the fallback', () => {
    // `??` only fills in null/undefined, so '' is deliberately preserved.
    const err = new TelemtApiException('sdk_timeout', '');

    expect(err.message).toBe('');
  });

  it('accepts requestId 0 without dropping it', () => {
    const err = new TelemtApiException('bad_request', 'Bad request', 0);

    expect(err.requestId).toBe(0);
  });

  it('is catchable as an Error and survives instanceof narrowing', () => {
    const thrower = () => {
      throw new TelemtApiException('forbidden', 'Nope', 7);
    };

    expect(thrower).toThrow(TelemtApiException);
    expect(thrower).toThrow('Nope');

    try {
      thrower();
    } catch (e) {
      expect(e instanceof TelemtApiException && e.requestId).toBe(7);
    }
  });
});
