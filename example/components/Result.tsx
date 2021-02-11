import { loadGetInitialProps } from "next/dist/next-server/lib/utils";
import * as React from "react";

export function has<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
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

const quotelessJson = (obj: any) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

export function Result(props: { value: any }) {
  const [results, setResults] = React.useState<{ key: number; value: any }[]>([
    { key: 0, value: props.value },
  ]);
  const [currentResult, ...previousResults] = results;

  React.useEffect(() => {
    setResults((prev) => {
      if (deepEqual(props.value, prev[0].value)) return prev;
      return [{ key: prev[0].key + 1, value: props.value }, ...prev];
    });
  }, [props.value]);

  return (
    <div className="mt-4">
      <pre className="font-mono rounded bg-gray-200 p-2 max-w-prose">
        {quotelessJson(currentResult.value)}
      </pre>
      {previousResults.length > 0 && (
        <details>
          <summary>Show previous values ({previousResults.length})</summary>
          {previousResults.map((result) => (
            <pre
              key={result.key}
              className="mt-2 font-mono rounded bg-gray-200 p-2 max-w-prose"
            >
              {quotelessJson(result.value)}
            </pre>
          ))}
        </details>
      )}
    </div>
  );
}
