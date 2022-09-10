import React from "react";
import type { AppFlags } from "flags/config";

export function EdgeFunctionContent(props: {
  checkoutVariant: AppFlags["checkout"];
}) {
  return (
    <React.Fragment>
      <p>
        This demo shows how to use <code>@happykit/flags</code> in{" "}
        <a
          href="https://nextjs.org/blog/next-12#introducing-middleware"
          rel="noreferrer noopener"
        >
          Next.js Middleware
        </a>
        .
      </p>
      <pre>
        You have been served the "<code>{props.checkoutVariant}</code>" checkout
        variant.
      </pre>
      <button
        type="button"
        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        onClick={() => {
          document.cookie =
            "hkvk=; path=/; maxAge=0; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          window.location.reload();
        }}
      >
        Remove cookie and reload
      </button>
      <p>
        This example uses a <code>middleware</code> file at{" "}
        <code>/middleware.ts</code> to statically render different variants for
        the <code>/demo/middleware</code> path. The different variants live
        under <code>pages/demo/middleware/[variant].tsx</code>.
      </p>
      <p>
        The middleware loads the flags and rewrites the incoming request either
        to <code>/demo/middleware/short</code>,{" "}
        <code>/demo/middleware/medium</code> or{" "}
        <code>/demo/middleware/full</code> depending on the resolved flag
        variant.
      </p>
      <p>
        The request to any of those paths will then be handled by{" "}
        <code>/demo/middleware/[variant].tsx</code>. That file will have
        staticaly generated a version for each variant. The request will thus
        get answered statically.
      </p>
      <p>
        Since the resulting page is served statically from the edge, the first
        render will use no visitor key. This is necessary as the concept of a
        visitor does not exist during static site generation. Thus all rules and
        percentage-based rollouts targeting a visitor resolve to{" "}
        <code>null</code>.
      </p>
      <p>
        The middleware loads the flags purely to decide where to rewrite the
        request to. It does not send any resolved flags into the application
        itself.
      </p>
      <p>
        You are however free to call <code>useFlags()</code> on the client and
        combine this approach with the middleware.
      </p>
    </React.Fragment>
  );
}
