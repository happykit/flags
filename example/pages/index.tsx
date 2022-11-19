import * as React from "react";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { useFlags } from "flags/client";

// defined outside to guarantee a consistent ref
const exampleFlagBag = {
  flags: {
    ads: true,
    checkout: "medium",
    discount: 5,
    purchaseButtonLabel: "Get it",
  },
  data: {
    flags: {
      ads: true,
      checkout: "medium",
      discount: 5,
      purchaseButtonLabel: "Get it",
    },
    visitor: {
      key: "jy9jlWoINT6RF80ckkVVA",
    },
  },
  error: null,
  fetching: false,
  settled: true,
  visitorKey: "jy9jlWoINT6RF80ckkVVA",
};

export default function Index() {
  return (
    <Layout title="Introduction" flagBag={null}>
      {/* Replace with your content */}
      <article className="py-4 prose max-w-prose">
        <p>
          This site contains usage examples for{" "}
          <a href="https://github.com/happykit/flags" target="_blank">
            <code>@happykit/flags</code>
          </a>
          .
        </p>
        <p>
          Read the <a href="https://github.com/happykit/flags">README.md</a>{" "}
          file for a full technical setup before you jump into these examples.
          The examples are intended as reference implementations for the
          different ways in which the <code>@happykit/flags</code> client can be
          used.
        </p>
        <p>
          Make sure you have set up <code>configure()</code> inside of{" "}
          <code>_app.js</code> before continuing with these examples.
        </p>

        <hr />

        <p className="max-w-prose text-gray-600">
          Boxes like the one below show the return value of the{" "}
          <code className="text-sm font-mono font-thin">useFlags()</code> hook.
          If you do this in your code
        </p>
        <pre>const flagBag = useFlags()</pre>
        <p>
          then the value of <code>flagBag</code> would be something like
        </p>
        <Result key="index" value={exampleFlagBag} />
        <p>
          We usually call this value the <code>flagBag</code>, as it contains
          the evaluated feature flags and a bunch of other things you might
          need.
        </p>
      </article>
    </Layout>
  );
}
