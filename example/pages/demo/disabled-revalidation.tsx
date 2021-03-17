import * as React from "react";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { useFlags } from "@happykit/flags/client";

export default function Page() {
  const flagBag = useFlags({ revalidateOnFocus: false });
  return (
    <Layout
      title="Demo: Disabled Revalidation"
      source="https://github.com/happykit/flags/blob/example/pages/demo/disabled-revalidation.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for static pages.
        </p>
        <Result key="disabled-validation" value={flagBag} />
      </div>
    </Layout>
  );
}
