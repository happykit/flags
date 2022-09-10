import * as React from "react";
import { GetStaticProps } from "next";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { getFlags } from "flags/server";
import { type InitialFlagState, useFlags } from "flags/client";

type StaticProps = { initialFlagState: InitialFlagState };

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: StaticProps) {
  const flagBag = useFlags({ initialState: props.initialFlagState });

  return (
    <Layout
      title="Static Site Generation (Hybrid)"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/static-site-generation-hybrid.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for static
          pages.
        </p>
        <p>
          This page is rendered statically at first. The first rendering pass
          will use no visitor key. This is necessary as the concept of a visitor
          does not exist during static site generation. Thus all rules and
          percentage-based rollouts targeting a visitor resolve to{" "}
          <code>null</code>. If provided, the fallback values will be used for
          those.
        </p>
        <p>
          The client reuses the statically evaluated feature flags for the first
          rendering pass. Then it reevaluates the flag with the visitor
          information. Some flags might change as a result of this.
        </p>
        <p>
          The <code>settled</code> value will then flip to true after the
          reevaluation on the client finishes.
        </p>
        <Result key="static-site-generation-hybrid" value={flagBag} />
      </article>
    </Layout>
  );
}
