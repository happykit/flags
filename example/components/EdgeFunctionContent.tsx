import React from "react";
import { AppFlags } from "../types/AppFlags";

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
          middleware
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
        Since this page is served statically from the edge, rendering will use
        no visitor key. This is necessary as the the concept of a visitor does
        not exist during static site generation. Thus all rules and
        percentage-based rollouts targeting a visitor resolve to{" "}
        <code>null</code>.
      </p>
    </React.Fragment>
  );
}
