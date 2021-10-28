import React from "react";
import { AppFlags } from "../../../types/AppFlags";

export function Content(props: { checkoutVariant: AppFlags["checkout"] }) {
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
      <p>
        Since this page is served from the edge. rendering will use no visitor
        key. This is necessary as the the concept of a visitor does not exist
        during static site generation. Thus all rules and percentage-based
        rollouts targeting a visitor resolve to <code>null</code>.
      </p>
    </React.Fragment>
  );
}
