import * as React from "react";
import { GetStaticProps } from "next";
import { Layout } from "../../../components/Layout";
import { Result } from "../../../components/Result";
import { getFlags } from "@happykit/flags/server";
import { AppFlags } from "../../../types/AppFlags";

type StaticProps = { flags: AppFlags | null };

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { flags } = await getFlags<AppFlags>({ context });
  return { props: { flags } };
};

export default function Page(props: StaticProps) {
  return (
    <Layout
      title="Middleware"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/middleware`}
      flagBag={null}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> in middleware.
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
