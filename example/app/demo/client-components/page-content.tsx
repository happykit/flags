"use client";
import { Result } from "components/Result";
import { useFlags } from "flags/client";

export function PageContent() {
  // pure client-side rendering without initial server-side data
  const flagBag = useFlags();

  return (
    <article className="py-4 prose max-w-prose">
      <p>
        This demo shows how to use <code>@happykit/flags</code> for client
        components in Next.js App Router.
      </p>
      <Result key="server-components" label="Flags" value={flagBag} />
    </article>
  );
}
