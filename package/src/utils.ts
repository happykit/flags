export function has<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
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
