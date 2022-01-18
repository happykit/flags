import * as React from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { Layout } from "../../../components/Layout";
import { EdgeFunctionContent } from "../../../components/EdgeFunctionContent";
import { AppFlags } from "../../../types/AppFlags";

// This file generates a static page for each variant (short, medium, full)
// You could also actually create one file for each variant instead.
export const getStaticPaths: GetStaticPaths = () => ({
  paths: [
    { params: { variant: "full" } },
    { params: { variant: "medium" } },
    { params: { variant: "short" } },
  ],
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ variant: string }> = (
  context
) => ({ props: { variant: context.params!.variant as string } });

export default function Page(props: { variant: AppFlags["checkout"] }) {
  return (
    <Layout
      title="Middleware"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/middleware`}
      flagBag={null}
    >
      <article className="py-4 prose max-w-prose">
        <EdgeFunctionContent checkoutVariant={props.variant} />
      </article>
    </Layout>
  );
}
