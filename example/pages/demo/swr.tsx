import * as React from "react";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import useSWR from "swr";

export default function Page() {
  const [state, setState] = React.useState<number>(0);
  const [forceError, setForceError] = React.useState<boolean>(false);

  const result = useSWR(`/api/swr?x=${state}`, {
    // initialData: {
    //   name: "John 0",
    // },
  });

  return (
    <Layout
      title="SWR"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/client-side-rendering.tsx`}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for regular
          pages.
        </p>
        <button
          type="button"
          onClick={() => {
            setState((prev) => prev + 1);
          }}
        >
          up
        </button>{" "}
        <button
          type="button"
          onClick={() => {
            setState((prev) => prev - 1);
          }}
        >
          down
        </button>
        <Result
          key="swr"
          value={{
            data: result.data || null,
            error: result.error || null,
            isValidating: result.isValidating,
          }}
        />
      </article>
    </Layout>
  );
}
