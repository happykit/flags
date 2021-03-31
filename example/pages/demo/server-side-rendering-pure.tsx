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
      title="Demo: Server Side Rendering (Pure)"
      source="https://github.com/happykit/flags/blob/example/pages/demo/server-side-rendering-pure.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for server-rendered pages.
        </p>
        <p className="mt-4 max-w-prose text-gray-600">
          Since this page is rendered on the server only, there is no "flagBag".
          Instead, the values are shown directly.
        </p>
        <Result
          key="server-side-rendering-pure"
          label="Flags"
          value={props.flags}
        />
        <p className="mt-6 max-w-prose text-gray-600">
          Aside from the flags, we have access to the loaded flags as well.
          These are the flags without any fallback values.
        </p>
        <Result
          key="server-side-rendering-pure-with-fallback-values"
          label="Loaded Flags (without fallback values)"
          value={props.loadedFlags}
        />
      </div>
    </Layout>
  );
}
