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
      title="Static Site Generation (Pure)"
      source={`https://github.com/happykit/flags/raw/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/static-site-generation-pure.tsx`}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for static
          pages.
        </p>
        <p>
          Since this page is only rendered statically, the rendering will use no
          visitor key. This is necessary as the the concept of a visitor does
          not exist during static site generation. Thus all rules and
          percentage-based rollouts targeting a visitor resolve to{" "}
          <code>null</code>.
        </p>
        <Result key="static-site-generation-pure" value={props.flags} />
      </article>
    </Layout>
  );
}
