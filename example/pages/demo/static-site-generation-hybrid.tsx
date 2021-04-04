import * as React from "react";
import { GetStaticProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { InitialFlagState, useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type StaticProps = { initialFlagState: InitialFlagState<AppFlags> };

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { initialFlagState } = await getFlags<AppFlags>({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: StaticProps) {
  const flagBag = useFlags({ initialState: props.initialFlagState });

  return (
    <Layout
      title="Demo: Static Site Generation (Hybrid)"
      source="https://github.com/happykit/flags/blob/example/pages/demo/static-site-generation-hybrid.tsx"
    >
      <article className="py-4 prose max-w-prose">
        <p>This demo shows how to use @happykit/flags for static pages.</p>
        <p>
          This page is rendered statically at first. The first rendering pass
          will use no visitor key. This is necessary as the the concept of a
          visitor does not exist during static site generation. Thus all rules
          and percentage-based rollouts targeting a visitor resolve to{" "}
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
