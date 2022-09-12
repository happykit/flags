import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { getFlags } from "flags/server";
import { type InitialFlagState, useFlags } from "flags/client";

type Traits = { teamMember: boolean };
type ServerSideProps = {
  initialFlagState: InitialFlagState;
  traits: Traits;
};

// This demo uses server-side rendering, but this works just as well with
// static site generation or client-only rendering.
export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  // These could be loaded from anywhere
  const traits: Traits = { teamMember: true };

  const { initialFlagState } = await getFlags({ context, traits });
  return { props: { initialFlagState, traits } };
};

export default function Page(props: ServerSideProps) {
  const flagBag = useFlags({
    initialState: props.initialFlagState,
    traits: props.traits,
  });
  return (
    <Layout
      title="Targeting by Traits"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/targeting-by-traits.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for targeting
          by traits.
        </p>
        <p>
          You can pass any traits into the flag evaluation. These traits can
          then be used by the rules defined in your flags. This allows you to
          resolve flags differently based on the provided traits.
        </p>
        <p>
          Traits can be related to the visitor, to the authenticated user or to
          anything else. You can pass any traits you want. Use the traits in
          your HappyKit flag rules to resolve the flag to different variants
          based on the passed traits.
        </p>
        <Result key="targeting-by-traits" value={flagBag} />
        <p>
          Note that aside from traits, HappyKit also has the concepts of a
          visitor and a user. These three concepts are all independent of each
          other.
        </p>
      </article>
    </Layout>
  );
}
