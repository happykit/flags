import * as React from 'react';

/* global fetch:false */

type Flags = { [key: string]: boolean | number | string };

type FlagConfig = {
  clientId?: string;
  endpoint: string;
};

type FlagUserAttributes = {
  key: string;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

type FlagOptions = {
  user?: FlagUserAttributes;
  initialFlags?: Flags;
  revalidateOnFocus?: boolean;
};

const defaultConfig: FlagConfig = {
  endpoint: 'https://happykit.dev/api/flags',
};

let config: FlagConfig = defaultConfig;

export const configure = (
  nextConfig: Partial<FlagConfig> & { clientId: string }
) => {
  if (typeof nextConfig !== 'object')
    throw new Error('@happykit/flags: config must be an object');

  if (typeof nextConfig.clientId !== 'string')
    throw new Error('@happykit/flags: Missing clientId');

  config = Object.assign({}, defaultConfig, nextConfig);
};

function toUserAttributes(user: any): FlagUserAttributes | null {
  if (typeof user !== 'object') return null;

  // users must have a key
  if (typeof user.key !== 'string' || user.key.trim().length === 0) return null;
  const userAttributes: FlagUserAttributes = { key: user.key.trim() };

  if (typeof user?.email === 'string') {
    userAttributes['email'] = user.email;
  }

  if (typeof user?.name === 'string') {
    userAttributes['name'] = user.name;
  }

  if (typeof user?.avatar === 'string') {
    userAttributes['avatar'] = user.avatar;
  }

  if (typeof user?.country === 'string') {
    userAttributes['country'] = user.country;
  }

  return userAttributes;
}

// copied from https://github.com/moroshko/shallow-equal/blob/1a6bf512cf896b44f3b7bb3d493411a7c5339a25/src/objects.js
function shallowEqual(objA: any, objB: any) {
  if (objA === objB) return true;

  if (!objA || !objB) return false;

  var aKeys = Object.keys(objA);
  var bKeys = Object.keys(objB);
  var len = aKeys.length;

  if (bKeys.length !== len) return false;

  for (var i = 0; i < len; i++) {
    var key = aKeys[i];

    if (
      objA[key] !== objB[key] ||
      !Object.prototype.hasOwnProperty.call(objB, key)
    ) {
      return false;
    }
  }

  return true;
}

function createBody(
  clientId: FlagConfig['clientId'],
  userAttributes: FlagUserAttributes | null
) {
  const body: {
    envKey: FlagConfig['clientId'];
    user?: FlagUserAttributes;
  } = {
    envKey: clientId,
  };

  if (userAttributes) body.user = userAttributes;

  return body;
}

async function fetchFlags(
  config: FlagConfig,
  userAttributes: FlagUserAttributes | null
): Promise<Flags | null> {
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      body: JSON.stringify(createBody(config.clientId, userAttributes)),
    });
    if (!response.ok) return null;

    const flags: Flags = await response.json();
    return flags;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Fetch flags primitive. Use this only if you're interested in the loading
 * state, use useFlag otherwise.
 *
 * @param options flag options
 * @returns null while loading, Flags otherwise
 */
export function usePrimitiveFlags(options?: FlagOptions): Flags | null {
  // use "null" to indicate that no initial flags were provided, but never
  // return "null" from the hook
  const [flags, setFlags] = React.useState<Flags | null>(
    options?.initialFlags ? options.initialFlags : null
  );

  const [
    userAttributes,
    setUserAttributes,
  ] = React.useState<FlagUserAttributes | null>(
    typeof options?.user === 'object' ? toUserAttributes(options.user) : null
  );

  // fetch on mount when no initialFlags were provided
  React.useEffect(() => {
    if (flags !== null) return;

    let active = true;

    fetchFlags(config, userAttributes).then(nextFlags => {
      // skip in case the request failed
      if (!nextFlags) return;
      // skip in case the component unmounted
      if (!active) return;
      setFlags(nextFlags);
    });

    return () => {
      active = false;
    };
  }, [flags]);

  // revalidate when incoming user changes
  const incomingUser = options?.user;
  React.useEffect(() => {
    const incomingUserAttributes = toUserAttributes(incomingUser);
    if (shallowEqual(userAttributes, incomingUserAttributes)) return;
    setUserAttributes(incomingUserAttributes);
  }, [userAttributes, setUserAttributes, incomingUser]);

  // revalidate on focus
  const revalidateOnFocus = options?.revalidateOnFocus;
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // undefined is treated as truthy since revalidateOnFocus defaults to true
    if (revalidateOnFocus === false) return;

    let latestFetchId: number;
    const listener = async () => {
      const fetchId = (latestFetchId = Date.now());

      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          body: JSON.stringify(createBody(config.clientId, userAttributes)),
        });
        if (!response.ok) return;

        const nextFlags: Flags = await response.json();

        // skip responses to outdated requests
        if (fetchId !== latestFetchId) return;

        // skip invalid responses
        if (typeof nextFlags !== 'object') return;

        setFlags(nextFlags);
      } catch (error) {
        console.error(error);
      }
    };

    window.addEventListener('focus', listener);
    return () => {
      window.removeEventListener('focus', listener);
    };
  }, [revalidateOnFocus, setFlags, userAttributes]);

  return flags;
}

/**
 * Fetches feature flags from HappyKit
 * @param options Options like initial flags or the targeted user.
 */
export function useFlags(options?: FlagOptions): Flags {
  const flags = usePrimitiveFlags(options);
  return flags === null ? {} : flags;
}

export const getFlags =
  typeof window === 'undefined'
    ? async function getFlags(userAttributes?: FlagUserAttributes | null) {
        const flags = await fetchFlags(
          config,
          userAttributes ? userAttributes : null
        );
        // answer with no flags in case the fetch failed
        return flags ? flags : {};
      }
    : async () => {
        throw new Error(
          '@happykit/flags: getFlags may not be called on the client'
        );
      };
