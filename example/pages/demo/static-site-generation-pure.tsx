import * as React from "react";
import { GetStaticProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type StaticProps = { flags: AppFlags };

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { flags } = await getFlags<AppFlags>({ context });
  return { props: { flags } };
};

export default function Page(props: StaticProps) {
  return (
    <Layout
      title="Demo: Static Site Generation (Pure)"
      source="https://github.com/happykit/flags/blob/example/pages/demo/static-site-generation-pure.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for static pages.
        </p>
        <p className="mt-4 max-w-prose text-gray-600">
          Since this page is only rendered statically, the rendering will use no
          visitor key. This is necessary as the the concept of a visitor does
          not exist during static site generation. Thus all rules and
          percentage-based rollouts targeting a visitor resolve to "null".
        </p>
        <Result key="static-site-generation-pure" value={props.flags} />
      </div>
    </Layout>
  );
}
