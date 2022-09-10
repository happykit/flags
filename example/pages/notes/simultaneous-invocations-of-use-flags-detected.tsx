import Link from "next/link";
import * as React from "react";
import { Layout } from "components/Layout";

export default function Page() {
  return (
    <Layout
      title="Simultaneous invocations of useFlags() detected"
      flagBag={null}
    >
      <article className="py-4 prose max-w-prose">
        <p className="max-w-prose text-gray-600">
          This page describes what to do about the{" "}
          <code>
            @happykit/flags: Simultaneous invocations of useFlags() detected
          </code>{" "}
          warning.
        </p>
        <h2>Why you see this warning</h2>
        <p>
          You are calling <code>useFlags()</code> multiple times on the same
          page.
        </p>
        <h2>Philosophy behind this warning</h2>
        <p>
          <code>useFlags()</code> is supposed to be called exactly once per
          page. Usually from within the page component. This has multiple
          benefits
        </p>
        <ul>
          <li>
            <code>useFlags()</code> invocations send requests to evaluate your
            feature flags. Calling <code>useFlag()</code> exactly once per page
            guarantees no extraneous requests are made.
          </li>
          <li>
            When you invoke <code>useFlags()</code> more than once per page your
            inputs might differ on each invocation. And so your flags might
            evaluate to different values.
          </li>
        </ul>
        <h2>How to resolve this warning</h2>
        <p>
          Call <code>useFlags()</code> only in your page components. If child
          components need access to the flags, pass the return value down to
          them using props.
        </p>
        <p>
          You can alternatively pass the return value via{" "}
          <Link href="/demo/context">
            <a>Context</a>
          </Link>{" "}
          if you dislike passing props. I would personally recommend passing it
          via props instead though.
        </p>
      </article>
    </Layout>
  );
}
