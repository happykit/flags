import * as React from "react";
import { Layout } from "../../../components/Layout";
import { EdgeFunctionContent } from "../../../components/EdgeFunctionContent";

export default function Page() {
  return (
    <Layout
      title="Middleware"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/middleware`}
      flagBag={null}
    >
      <article className="py-4 prose max-w-prose">
        <EdgeFunctionContent checkoutVariant="short" />
      </article>
    </Layout>
  );
}
