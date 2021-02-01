/**
 * @jest-environment node
 */
import 'jest-fetch-mock';
import { getFlags, configure, _reset } from '../src';

const fakeResponse = {
  body: JSON.stringify({ aFlag: true }),
  options: { headers: { 'content-type': 'application/json' } },
};

beforeEach(() => {
  _reset();
  fetchMock.resetMocks();
});

describe('getFlags', () => {
  it('exports getFlags', () => {
    expect(typeof getFlags).toBe('function');
  });

  it('throws when envKey is not set', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    let caughtError = null;
    try {
      await getFlags();
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toEqual(
      Error('@happykit/flags: Missing config.envKey')
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches flags from server', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    const flags = await getFlags();
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: '{"envKey":"foo"}',
      method: 'POST',
    });
  });

  it('forwards the given user', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    const user = { key: 'user_key_1' };
    const flags = await getFlags(user);
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user }),
      method: 'POST',
    });
  });
  it('strips unknown user attributes', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    const user = { key: 'user_key_1' };
    const flags = await getFlags({
      ...user,
      anUnknownAttribute: 'do-not-forward-me',
    } as any);
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user }),
      method: 'POST',
    });
  });
  it('forwards all supported user attributes', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    const user = {
      key: 'user_key_1',
      email: 'test@mail.com',
      name: 'test name',
      avatar: 'avatar-url',
      country: 'DE',
    };
    const flags = await getFlags(user);
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user }),
      method: 'POST',
    });
  });

  it('merges application-wide default flag values in', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    const defaultFlags = { xzibit: true };
    configure({ envKey: 'foo', defaultFlags });
    const flags = await getFlags();
    expect(flags).toEqual({ aFlag: true, ...defaultFlags });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });

  it('uses actual values over default values', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    const defaultFlags = { xzibit: true };
    configure({ envKey: 'foo', defaultFlags });
    const flags = await getFlags();
    expect(flags).toEqual({ aFlag: true, xzibit: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });
});
