import * as React from "react";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { useFlags } from "flags/client";

export default function Page() {
  const flagBag = useFlags();
  return (
    <Layout
      title="Basic Usage"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/basic-usage.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This shows the basics of how to use <code>@happykit/flags</code>. You
          can find more detailed examples for the different use cases in the
          navigation.
        </p>
        <p>
          In this example where <code>@happykit/flags</code> is used for a
          static site, you'll notice three different renders
        </p>
        <ul>
          <li>
            the earliest one (Render #1) is the initial render, using the
            fallback flags (no fallback is configured in this demo)
          </li>
          <li>
            the second one (Render #2) is the rehydration from the cache, whose
            outcome depends on whether you have visited the demo page before
          </li>
          <li>
            the last one (Render #3) is the final settlement with the flags
            loaded from the server
          </li>
        </ul>
        <p>
          Notice that the <code>settled</code> flag only switches to{" "}
          <code>true</code> after the flags were loaded from the server and are
          thus guaranteed to be up to date.
        </p>
        <p>
          If you are doing capturing important information or causing heavy work
          like code splitting depending on feature flags, it's best to wait
          until <code>settled</code> turns <code>true</code>. You can then kick
          the work of confidently.
        </p>
        <Result key="basic-usage" value={flagBag} />
      </article>
    </Layout>
  );
}
