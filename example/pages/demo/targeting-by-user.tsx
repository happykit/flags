import * as React from "react";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { useFlags } from "@happykit/flags/client";

export default function Page() {
  const flagBag = useFlags({ user: { key: "fake-user-key-1", name: "Jon" } });
  return (
    <Layout
      title="Demo: Targeting by User"
      source="https://github.com/happykit/flags/blob/example/pages/demo/targeting-by-user.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for static pages.
        </p>
        <Result key="targeting-by-user" value={flagBag} />
      </div>
    </Layout>
  );
}
