import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';
import * as React from 'react';
import 'jest-fetch-mock';
import { useFlags, getFlags, configure, _resetConfig } from '../src';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

const fakeResponse = {
  body: JSON.stringify({ aFlag: true }),
  options: { headers: { 'content-type': 'application/json' } },
};

beforeEach(() => {
  _resetConfig();
  fetchMock.resetMocks();
});

describe('exports', () => {
  it('exports a configure function', () => {
    expect(typeof configure).toBe('function');
  });

  it('exports a useFlags hook', () => {
    expect(typeof useFlags).toBe('function');
  });
});

describe('useFlags', () => {
  describe('missing clientId', () => {
    it('throws when configure was not called', async () => {
      const { result } = renderHook(() => useFlags());
      expect(result.error).toEqual(
        Error('@happykit/flags: Missing config.clientId')
      );
    });
  });

  it('posts to the flags endpoint', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    // flags are an empty object until the first response arrives
    expect(result.current).toEqual({});
    await waitForNextUpdate();
    // flags are defined from then on
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: '{"envKey":"foo"}',
      method: 'POST',
    });
  });

  it('forwards the given user', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const { result, waitForNextUpdate } = renderHook(() =>
      useFlags({
        user: {
          key: 'user_key_1',
          anUnknownAttribute: 'do-not-forward-me',
        } as any,
      })
    );
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: '{"envKey":"foo","user":{"key":"user_key_1"}}',
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('strips unknown attributes before forwarding a given user', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ clientId: 'foo' });
    const { result, waitForNextUpdate } = renderHook(() =>
      useFlags({
        user: {
          key: 'user_key_1',
          anUnknownAttribute: 'do-not-forward-me',
        } as any,
      })
    );
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: '{"envKey":"foo","user":{"key":"user_key_1"}}',
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    const { result, waitForNextUpdate } = renderHook(() => useFlags({ user }));
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('merges application-wide default flag values in', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    const defaultFlags = { xzibit: true };
    configure({ clientId: 'foo', defaultFlags });
    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true, ...defaultFlags });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses actual values over default values', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    configure({ clientId: 'foo', defaultFlags: { xzibit: true } });
    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    // default value as no response was given yet
    expect(result.current).toEqual({ xzibit: true });
    await waitForNextUpdate();
    // updated value where actual flag overwrites default flag
    expect(result.current).toEqual({ aFlag: true, xzibit: false });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch on mount when initial flag values were provided', async () => {
    fetchMock.mockOnce();
    const initialFlags = { xzibit: true };
    configure({ clientId: 'foo' });
    const { result } = renderHook(() => useFlags({ initialFlags }));
    expect(result.current).toEqual(initialFlags);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refetches flags and overwrites them when the window regains focus', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    configure({ clientId: 'foo' });
    const initialFlags = { xzibit: true };
    const Page = () => {
      const flags = useFlags({ initialFlags });

      return <p>{flags.aFlag ? 'hello' : 'waiting'}</p>;
    };
    render(<Page />);

    await waitFor(() => {
      expect(screen.queryByText('waiting')).toBeInTheDocument();
    });

    fireEvent.blur(window);
    fireEvent.focus(window);

    await waitFor(() => {
      expect(screen.queryByText('hello')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not refetch on focus when revalidateOnFocus is set', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    configure({ clientId: 'foo' });
    const initialFlags = { xzibit: true };
    const Page = () => {
      const flags = useFlags({ initialFlags, revalidateOnFocus: false });

      return <p>{flags.aFlag ? 'hello' : 'waiting'}</p>;
    };
    render(<Page />);

    await waitFor(() => {
      expect(screen.queryByText('waiting')).toBeInTheDocument();
    });

    fireEvent.blur(window);
    fireEvent.focus(window);

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });
});

describe('getFlags', () => {
  it('throws when called on the client', async () => {
    let caughtError = null;
    try {
      await getFlags();
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toEqual(
      Error('@happykit/flags: getFlags may not be called on the client')
    );
  });
});
