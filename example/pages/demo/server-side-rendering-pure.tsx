import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type ServerSideProps = { flags: AppFlags; loadedFlags: AppFlags | null };

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { flags, loadedFlags } = await getFlags<AppFlags>({ context });
  return { props: { flags, loadedFlags } };
};

export default function Page(props: ServerSideProps) {
  return (
    <Layout
      title="Server Side Rendering (Pure)"
      source={`https://github.com/happykit/flags/raw/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/server-side-rendering-pure.tsx`}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use @happykit/flags for server-rendered pages.
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
          label="Loaded Flags (without fallback values)"
          value={props.loadedFlags}
        />
      </article>
    </Layout>
  );
}
