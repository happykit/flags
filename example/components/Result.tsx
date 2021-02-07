import * as React from "react";

const quotelessJson = (obj: any) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

export function Result(props: { value: any }) {
  return (
    <pre className="mt-4 font-mono rounded bg-gray-200 p-2 max-w-prose">
      {quotelessJson(props.value)}
    </pre>
  );
}
