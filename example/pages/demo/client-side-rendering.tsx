import * as React from "react";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { useFlags } from "flags/client";

export default function Page() {
  const flagBag = useFlags();

  return (
    <Layout
      title="Client-Side Rendering"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/client-side-rendering.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for regular
          pages.
        </p>
        <p>
          In this configuration, the feature flags will be loaded when the
          client renders the page. They will not be loaded at build time. Check
          the Static Site Generation examples if you need that, or the
          Server-Side Rendering examples.
        </p>
        <p>
          When the page mounts, <code>@happykit/flags</code> will fetch the
          latest flags from the server and render the page accordingly.
        </p>
        <p>
          The <code>settled</code> value will then flip to true after the
          evaluation on the client finishes.
        </p>
        <Result key="static-site-generation-hybrid" value={flagBag} />
      </article>
    </Layout>
  );
}
