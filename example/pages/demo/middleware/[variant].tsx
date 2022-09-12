import * as React from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { Layout } from "components/Layout";
import { EdgeFunctionContent } from "components/EdgeFunctionContent";
import type { AppFlags } from "flags/config";

// ℹ️ Check out the /middleware.ts file as well.
// That middlware.ts file routes requests to /demo/middlware
// to any of the variants under /demo/middleware/:variant.
//
// It is the second piece aside from this [variant].tsx file.

// This generates a static page for each variant (short, medium, full).
// You could also create these files manually instead of generating them.
// But we use the path generating approach for this demo.
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
