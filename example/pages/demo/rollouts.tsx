import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "components/Layout";
import { Result } from "components/Result";
import { getFlags } from "flags/server";
import { useFlags, type InitialFlagState } from "flags/client";

type ServerSideProps = { initialFlagState: InitialFlagState };

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: ServerSideProps) {
  const flagBag = useFlags({ initialState: props.initialFlagState });
  return (
    <Layout
      title="Rollouts"
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/pages/demo/rollouts.tsx`}
      flagBag={flagBag}
    >
      <article className="py-4 prose max-w-prose">
        <p>
          This demo shows how to use <code>@happykit/flags</code> for rollouts.
        </p>
        <p>
          You can use flags to roll out features to a certain percentage of your
          users. Or you can use flags as the basis for your A/B-testing. This is
          all enabled by having the option to serve a variant to a certain
          percentage of incoming requests. We refer to this as percentage-based
          rollouts, or rollouts for short.
        </p>
        <p>
          Rollouts work with any rendering strategy and you don't need to do
          anything special inside of <code>@happykit/flags</code>.
        </p>
        <h3>Setup</h3>
        <p>
          You can configure rollouts in rules or in the <code>On</code> default
          of your flag. Simply use the UI to specify which percentage of flag
          evaluations should be answered by which variant.
        </p>
        <p>
          <i>
            Note that configuring rollouts is only possible in the flag details
            after you created the flag. It is not possible when you first create
            a flag.
          </i>
        </p>
        <h3>Splitting based on attributes</h3>
        <p>
          The percentage-based rollouts happen based on an attribute you specify
          when setting the rollout. You can use the <code>visitorKey</code>, any
          user attribute or any trait as the basis of the rollout.
        </p>
        <p>
          Splitting on the same attribute value will always resolve to the same
          flag variant. A flag will resolve to <code>null</code> in case the
          attribute used as the base of splitting was not present on the
          request.
        </p>
        <h3>Example</h3>
        <p>
          When you first loaded this page, <code>@happykit/flags</code>{" "}
          generated a visitor key for you during server-side rendering. This key
          was then stored as a cookie in your browser by <code>getFlags()</code>
          .
        </p>
        <p>
          The <code>purchaseButtonLabel</code> flag is configured to do a
          rollout of <i>"Purchase"</i>, <i>"Buy now"</i>, <i>"Add to cart"</i>{" "}
          or <i>"Get it"</i> split evenly with 25% weight each.
        </p>
        <p>
          If you refresh the page, you'll consistently see the same value. But
          if you repeatedly open the same page in a new Incognito Window, you'll
          see the four possible values alternate.
        </p>
        <pre>
          purchaseButtonLabel: "{flagBag.flags?.purchaseButtonLabel}"
          <br />
          visitorKey: "{flagBag.visitorKey}"
        </pre>
        <p>
          Your <code>purchaseButtonLabel</code> is currently resolving to{" "}
          <span className="italic font-semibold">
            "{flagBag.flags?.purchaseButtonLabel}"
          </span>{" "}
          based on your <code>visitorKey</code>, which is set to{" "}
          <code>{flagBag.visitorKey}</code>.
        </p>
        <Result key="rollout" value={flagBag} />
      </article>
    </Layout>
  );
}
