import * as React from "react";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { useFlags } from "flags/client";

export default function Page() {
  const flagBag = useFlags({ revalidateOnFocus: false });
  return (
    <Layout
      title="Disabled Revalidation"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/disabled-revalidation.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to configure <code>@happykit/flags</code> to not
          refetch the flags when the window regains focus.
        </p>
        <p>
          When you leave the window and come back to it later, HappyKit will
          reevaluate the feature flags by default. A new request is sent and the
          browser's flags are reevaluated. We use the{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-800"
          >
            visibility change
          </a>{" "}
          API to detect when the window regained focus. But this behavior can be
          turned off. This demo shows how to prevent reevaluations when the
          window regains focus.
        </p>
        <Result key="disabled-validation" value={flagBag} />
      </article>
    </Layout>
  );
}
