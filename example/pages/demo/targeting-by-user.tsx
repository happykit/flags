import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { getFlags } from "flags/server";
import { type InitialFlagState, useFlags } from "flags/client";

type User = { key: string; name: string };

type ServerSideProps = {
  initialFlagState: InitialFlagState;
  user: User;
};

// This demo uses server-side rendering, but this works just as well with
// static site generation or client-only rendering.
export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  // These could be loaded from anywhere
  const user: User = { key: "fake-user-key-1", name: "Jon" };

  const { initialFlagState } = await getFlags({ context, user });
  return { props: { initialFlagState, user } };
};

export default function Page(props: ServerSideProps) {
  const flagBag = useFlags({
    initialState: props.initialFlagState,
    user: props.user,
  });
  return (
    <Layout
      title="Targeting by User"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/targeting-by-user.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for targeting
          users.
        </p>
        <p>
          HappyKit allows you to do pass in a user. You can use that user and
          the provided uesr profile for rules or percentage-based rollouts. The
          fields supported in the user profile are defined in the README and in
          the TypeScript types.
        </p>
        <Result key="targeting-by-user" value={flagBag} />
        <p>
          Note that aside from users, HappyKit also has the concepts of a
          visitor and traits. These three concepts are all independent of each
          other.
        </p>
      </article>
    </Layout>
  );
}
