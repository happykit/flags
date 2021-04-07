import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { InitialFlagState, useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type ServerSideProps = { initialFlagState: InitialFlagState<AppFlags> };

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags<AppFlags>({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: ServerSideProps) {
  const flagBag = useFlags({ initialState: props.initialFlagState });
  return (
    <Layout
      title="Demo: Server Side Rendering (Hybrid)"
      source="https://github.com/happykit/flags/blob/example/pages/demo/server-side-rendering-hybrid.tsx"
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for server-rendered pages.
        </p>
        <p>
          The server preloads the initial values and the client then rehydrates
          them.
        </p>
        <p>
          This means the client does not need to reload the flags. It simply
          rehydrates the result of the server-side rendering.
        </p>
        <p>
          However, when you leave the window and come back to it, a new request
          is sent and the browser's flags are reevaluated. We use the{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event"
            target="_blank"
            rel="noopener noreferrer"
          >
            visibility change
          </a>{" "}
          API for that. You can try this by switching to another tab and then
          coming back to this one.
        </p>
        <Result key="server-side-rendering-hybrid" value={flagBag} />
      </article>
    </Layout>
  );
}
