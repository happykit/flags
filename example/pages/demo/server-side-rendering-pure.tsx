import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { getFlags, type EvaluationResponseBody } from "flags/server";
import type { AppFlags } from "flags/config";

type ServerSideProps = {
  flags: AppFlags | null;
  data: EvaluationResponseBody | null;
};

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { flags, data } = await getFlags({ context });
  return { props: { flags, data } };
};

export default function Page(props: ServerSideProps) {
  return (
    <Layout
      title="Server Side Rendering (Pure)"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/server-side-rendering-pure.tsx`}
      flagBag={null}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for
          server-rendered pages.
        </p>
        <p>
          Since this page is rendered on the server only, there is no{" "}
          <code>flagBag</code>. Instead, the values are shown directly.
        </p>
        <Result
          key="server-side-rendering-pure"
          label="Flags"
          value={props.flags}
        />
        <p>
          Aside from the flags, we have access to the loaded flags as well.
          These are the flags without any fallback values.
        </p>
        <Result
          key="server-side-rendering-pure-with-fallback-values"
          label="Loaded data (without fallback values)"
          value={props.data}
        />
      </article>
    </Layout>
  );
}
