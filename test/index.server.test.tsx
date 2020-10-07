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

  it('throws when clientId is not set', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    let caughtError = null;
    try {
      await getFlags();
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toEqual(
      Error('@happykit/flags: Missing config.clientId')
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches flags from server', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
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
    configure({ clientId: 'foo' });
    const user = { key: 'user_key_1' };
    const flags = await getFlags({ user });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user }),
      method: 'POST',
    });
  });

  it('strips unknown user attributes', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const user = { key: 'user_key_1' };
    const flags = await getFlags({
      user: {
        ...user,
        anUnknownAttribute: 'do-not-forward-me',
      } as any,
    });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user }),
      method: 'POST',
    });
  });

  it('forwards all supported user attributes', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const user = {
      key: 'user_key_1',
      email: 'test@mail.com',
      name: 'test name',
      avatar: 'avatar-url',
      country: 'DE',
    };
    const flags = await getFlags({ user });
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
    configure({ clientId: 'foo', defaultFlags });
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
    configure({ clientId: 'foo', defaultFlags });
    const flags = await getFlags();
    expect(flags).toEqual({ aFlag: true, xzibit: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });

  it('sends "persist" when "persist" is set in the global config', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo', persist: true });
    const user = { key: 'user_key_1' };
    const flags = await getFlags({ user });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', persist: true, user }),
      method: 'POST',
    });
  });

  it('sends "persist" when "persist" is set in getFlags', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const user = { key: 'user_key_1' };
    const flags = await getFlags({ user, persist: true });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', persist: true, user }),
      method: 'POST',
    });
  });

  it('does not pass "persist" when "persist" is set in getFlags and no user is given', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const flags = await getFlags({ persist: true });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });

  it('does not send "persist" when "persist" is set in the global config but overwritten by getFlags', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo', persist: true });
    const flags = await getFlags({ persist: false });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });

  it('does not send "persist" when "persist" is set in the global config but no user is provided', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo', persist: true });
    const flags = await getFlags();
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });

  it('does not send "persist" when "persist" is set in getFlags but no user is provided', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const flags = await getFlags({ persist: true });
    expect(flags).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
  });
});
