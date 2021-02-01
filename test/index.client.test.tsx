import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';
import * as React from 'react';
import 'jest-fetch-mock';
import { useFlags, getFlags, configure, _reset } from '../src';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

const fakeResponse = {
  body: JSON.stringify({ aFlag: true }),
  options: { headers: { 'content-type': 'application/json' } },
};

beforeEach(() => {
  _reset();
  fetchMock.resetMocks();
  window.localStorage.removeItem('happykit_flags');
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
  describe('missing envKey', () => {
    it('throws when configure was not called', async () => {
      const { result } = renderHook(() => useFlags());
      expect(result.error).toEqual(
        Error('@happykit/flags: Missing config.envKey')
      );
    });
  });

  it('posts to the flags endpoint', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
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
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
      })
    );
  });

  it('forwards the given user', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const { result, waitForNextUpdate } = renderHook(() =>
      useFlags({ user: { key: 'user_key_1' } })
    );
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: '{"envKey":"foo","user":{"key":"user_key_1"}}',
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
        userAttributesKey: 'user_key_1',
      })
    );
  });

  it('strips unknown attributes before forwarding a given user', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
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
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
        userAttributesKey: 'user_key_1',
      })
    );
  });

  it('forwards all supported user attributes', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
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
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
        userAttributesKey: 'user_key_1',
      })
    );
  });

  it('merges application-wide default flag values in', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    const defaultFlags = { xzibit: true };
    configure({ envKey: 'foo', defaultFlags });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true, ...defaultFlags });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        // the default flags are not persisted, as they'll be added anyways
        flags: { aFlag: true },
      })
    );
  });

  it('uses actual values over default values', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    configure({ envKey: 'foo', defaultFlags: { xzibit: true } });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
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
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true, xzibit: false },
      })
    );
  });

  it('does not fetch on mount when initial flag values were provided', async () => {
    fetchMock.mockOnce();
    const initialFlags = { xzibit: true };
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const { result } = renderHook(() => useFlags({ initialFlags }));
    expect(result.current).toEqual(initialFlags);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('happykit_flags')).toBeNull();
  });

  it('refetches flags and overwrites them when the window regains focus', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const initialFlags = { xzibit: true };
    const Page = () => {
      const flags = useFlags<{ aFlag?: string; xzibit: boolean }>({
        initialFlags,
      });

      return <p>{flags.aFlag ? 'hello' : 'waiting'}</p>;
    };
    render(<Page />);

    await waitFor(() => {
      expect(screen.queryByText('waiting')).toBeInTheDocument();
    });

    expect(localStorage.getItem('happykit_flags')).toBeNull();

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
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true, xzibit: false },
      })
    );
  });

  it('does not refetch on focus when revalidateOnFocus is disabled', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ aFlag: true, xzibit: false }),
      fakeResponse.options
    );
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const initialFlags = { xzibit: true };
    const Page = () => {
      const flags = useFlags<{ aFlag?: string; xzibit: boolean }>({
        initialFlags,
        revalidateOnFocus: false,
      });

      return <p>{flags.aFlag ? 'hello' : 'waiting'}</p>;
    };
    render(<Page />);

    await waitFor(() => {
      expect(screen.queryByText('waiting')).toBeInTheDocument();
    });

    fireEvent.blur(window);
    fireEvent.focus(window);

    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(localStorage.getItem('happykit_flags')).toBeNull();
  });

  it('only fetches once when the hook is called with the same params while another fetch for those params is already in progress', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ someFlag: true }),
      fakeResponse.options
    );
    configure({ envKey: 'foo' });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const Page = () => {
      const flagsA = useFlags<{ someFlag?: string }>();
      const flagsB = useFlags<{ someFlag?: string }>();

      return (
        <ul>
          <li>{flagsA.someFlag ? 'a: hello' : 'a: waiting'}</li>
          <li>{flagsB.someFlag ? 'b: hello' : 'b: waiting'}</li>
        </ul>
      );
    };
    render(<Page />);

    await waitFor(() => {
      expect(screen.queryByText('a: hello')).toBeInTheDocument();
      expect(screen.queryByText('b: hello')).toBeInTheDocument();
    });

    // only called once even though the hook is used twice
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('only fetches once when the hook is called with the same params while another fetch for those params is already in progress even when the cache is disabled', async () => {
    fetchMock.mockOnce(
      JSON.stringify({ someFlag: true }),
      fakeResponse.options
    );
    configure({ envKey: 'foo', disableCache: true });
    expect(localStorage.getItem('happykit_flags')).toBeNull();
    const Page = () => {
      const flagsA = useFlags<{ someFlag?: string }>();
      const flagsB = useFlags<{ someFlag?: string }>();

      return (
        <ul>
          <li>{flagsA.someFlag ? 'a: hello' : 'a: waiting'}</li>
          <li>{flagsB.someFlag ? 'b: hello' : 'b: waiting'}</li>
        </ul>
      );
    };
    render(<Page />);

    await waitFor(() => {
      expect(screen.queryByText('a: hello')).toBeInTheDocument();
      expect(screen.queryByText('b: hello')).toBeInTheDocument();
    });

    // only called once even though the hook is used twice
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preloads hooks from cache after initial render and updates cache with new values when no user is set', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });

    // prepare localStorage
    localStorage.setItem(
      'happykit_flags',
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: false, bFlag: false },
      })
    );

    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    expect(result.current).toEqual({ aFlag: false, bFlag: false });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
      })
    );
  });
  it('preloads hooks from cache after initial render and updates cache with new values when a user key is set', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });

    // prepare localStorage
    localStorage.setItem(
      'happykit_flags',
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: false, bFlag: false },
        userAttributesKey: 'user_A',
      })
    );

    const { result, waitForNextUpdate } = renderHook(() =>
      useFlags({ user: { key: 'user_A' } })
    );
    expect(result.current).toEqual({ aFlag: false, bFlag: false });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user: { key: 'user_A' } }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
        userAttributesKey: 'user_A',
      })
    );
  });

  it('ignores cached values when the flag user key does not match', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });

    // prepare localStorage
    localStorage.setItem(
      'happykit_flags',
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: false, bFlag: false },
        userAttributesKey: 'user_A',
      })
    );

    const { result, waitForNextUpdate } = renderHook(() =>
      useFlags({ user: { key: 'user_B' } })
    );
    expect(result.current).toEqual({
      /* no flags since user key did not match */
    });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user: { key: 'user_B' } }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
        userAttributesKey: 'user_B',
      })
    );
  });

  it('ignores cached values when the cache has a user but the hook does not', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });

    // prepare localStorage
    localStorage.setItem(
      'happykit_flags',
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: false, bFlag: false },
        userAttributesKey: 'user_A',
      })
    );

    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    expect(result.current).toEqual({
      /* no flags since user key did not match */
    });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
      })
    );
  });

  it('ignores cached values when the cache has no user but the hook has one', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo' });

    // prepare localStorage
    localStorage.setItem(
      'happykit_flags',
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: false, bFlag: false },
      })
    );

    const { result, waitForNextUpdate } = renderHook(() =>
      useFlags({ user: { key: 'user_B' } })
    );
    expect(result.current).toEqual({
      /* no flags since user key did not match */
    });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo', user: { key: 'user_B' } }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify({
        endpoint: 'https://happykit.dev/api/flags',
        envKey: 'foo',
        flags: { aFlag: true },
        userAttributesKey: 'user_B',
      })
    );
  });

  it('ignores cached values when disableCache is set', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo', disableCache: true });

    const cachedFlags = {
      endpoint: 'https://happykit.dev/api/flags',
      envKey: 'foo',
      flags: { aFlag: false, bFlag: false },
    };

    // prepare localStorage
    localStorage.setItem('happykit_flags', JSON.stringify(cachedFlags));

    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    expect(result.current).toEqual({
      /* no flags since user key did not match */
    });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // no changes to localStorage
    expect(localStorage.getItem('happykit_flags')).toEqual(
      JSON.stringify(cachedFlags)
    );
  });

  it('ignores cached values when disableCache is set', async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: 'foo', disableCache: true });

    expect(localStorage.getItem('happykit_flags')).toBeNull();

    const { result, waitForNextUpdate } = renderHook(() => useFlags());
    expect(result.current).toEqual({
      /* no flags since user key did not match */
    });
    await waitForNextUpdate();
    expect(result.current).toEqual({ aFlag: true });
    expect(fetchMock).toHaveBeenCalledWith('https://happykit.dev/api/flags', {
      body: JSON.stringify({ envKey: 'foo' }),
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // no changes to localStorage
    expect(localStorage.getItem('happykit_flags')).toBeNull();
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
