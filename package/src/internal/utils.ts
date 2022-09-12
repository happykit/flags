import type { Flags } from "./types";

export function has<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function omitNullValues<O extends object, T = Partial<O>>(obj: O): T {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null) acc[key as keyof T] = value;
    return acc;
  }, {} as T);
}

/**
 * Returns a combination of the loaded flags and the default flags.
 *
 * Tries to return the loaded flags directly in case the they contain all defaults
 * to avoid changing object references in the caller.
 *
 * @param rawFlags
 * @param defaultFlags
 */
export function combineRawFlagsWithDefaultFlags<F extends Flags>(
  rawFlags: F | null,
  defaultFlags: Flags
): F {
  if (!rawFlags) return defaultFlags as F;

  const rawFlagsContainAllDefaultFlags = Object.keys(defaultFlags).every(
    (key) => has(rawFlags, key) && rawFlags[key] !== null
  );

  return rawFlagsContainAllDefaultFlags
    ? (rawFlags as F)
    : ({
        // this triple ordering ensures that null-ish loaded values are
        // overwritten by the defaults:
        //   - loaded null & default exists => default value
        //   - loaded null & no default => null
        //   - loaded value & default => loaded value
        //   - loaded value & no default => loaded value
        ...rawFlags,
        ...defaultFlags,
        ...omitNullValues(rawFlags),
      } as F);
}

/**
 * Gets the cookie by the name
 *
 * From: https://developers.cloudflare.com/workers/examples/extract-cookie-value
 */
export function getCookie(
  cookieString: string | null | undefined,
  name: string
) {
  if (cookieString) {
    const cookies = cookieString.split(";");
    for (let cookie of cookies) {
      const cookiePair = cookie.split("=", 2);
      const cookieName = cookiePair[0].trim();
      if (cookieName === name) return cookiePair[1];
    }
  }
  return null;
}

export function serializeVisitorKeyCookie(visitorKey: string) {
  // Max-Age 15552000 seconds equals 180 days
  return `hkvk=${encodeURIComponent(
    visitorKey
  )}; Path=/; Max-Age=15552000; SameSite=Lax`;
}

// source: https://github.com/lukeed/dequal/blob/master/src/lite.js
export function deepEqual(objA: any, objB: any) {
  var ctor, len;
  if (objA === objB) return true;

  if (objA && objB && (ctor = objA.constructor) === objB.constructor) {
    if (ctor === Date) return objA.getTime() === objB.getTime();
    if (ctor === RegExp) return objA.toString() === objB.toString();

    if (ctor === Array) {
      if ((len = objA.length) === objB.length) {
        while (len-- && deepEqual(objA[len], objB[len]));
      }
      return len === -1;
    }

    if (!ctor || typeof objA === "object") {
      len = 0;
      for (ctor in objA) {
        if (has(objA, ctor) && ++len && !has(objB, ctor)) return false;
        if (!(ctor in objB) || !deepEqual(objA[ctor], objB[ctor])) return false;
      }
      return Object.keys(objB).length === len;
    }
  }

  return objA !== objA && objB !== objB;
}

export class ObjectMap<Key extends any, Value extends any> {
  keys: Key[];
  values: Value[];

  constructor() {
    this.keys = [];
    this.values = [];
  }

  private _getIndex(key: Key) {
    return this.keys.findIndex((storedKey) => deepEqual(key, storedKey));
  }

  set(key: Key, value: Value) {
    const index = this._getIndex(key);
    if (index == -1) {
      // "push" to front of arrays as more recently values are more likely
      // to be looked up again, and we want them to match early
      this.keys = [key, ...this.keys];
      this.values = [value, ...this.values];
    } else {
      this.values[index] = value;
    }
  }

  get<ReturnValue>(key: Key): ReturnValue | null {
    const index = this._getIndex(key);
    return index === -1 ? null : (this.values[index] as unknown as ReturnValue);
  }

  // exists(key: Key) {
  //   return this.keys.some((storedKey) => deepEqual(storedKey, key));
  // }

  /** Resets the cache. For testing purposes. */
  clear() {
    this.keys = [];
    this.values = [];
  }
}
