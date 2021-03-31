import * as React from "react";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { useFlags } from "@happykit/flags/client";

export default function Page() {
  const flagBag = useFlags();
  return (
    <Layout
      title="Demo: Basic Usage"
      source="https://github.com/happykit/flags/blob/example/pages/demo/basic-usage.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for static pages.
        </p>
        <p className="mt-4 max-w-prose text-gray-600">
          You'll notice three different flagBag values
        </p>
        <ul className="list-disc ml-6 max-w-prose text-gray-600">
          <li className="mt-2">
            the last one is the final settlement with the flags loaded from the
            server
          </li>
          <li className="mt-2">
            the second one is the rehydration from the cache in localStorage,
            whose outcome depends on whether you have visited the demo page
            before
          </li>
          <li className="mt-2">
            the earliest one is the initial render, using the fallback flags (no
            fallback is configured in this demo)
          </li>
        </ul>
        <p className="max-w-prose text-gray-600 mt-4">
          Notice that the "settled" flag only switches to "true" after the flags
          were loaded from the server and are thus guaranteed to be up to date.
        </p>
        <p className="max-w-prose text-gray-600 mt-4">
          If you are doing capturing important information or causing heavy work
          like code splitting depending on feature flags, it's best to wait
          until "settled" turns true. You can then kick the work of confidently.
        </p>
        <Result key="basic-usage" value={flagBag} />
      </div>
    </Layout>
  );
}
