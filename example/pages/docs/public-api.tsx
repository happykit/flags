import * as React from "react";
import { Layout } from "components/Layout";
import { HelpBox } from "components/HelpBox";
import dedent from "dedent";

function Response(props: { children: string }) {
  return (
    <pre>
      <div className="text-gray-400 text-xs pb-1">Response</div>
      {props.children}
    </pre>
  );
}

function curl(literals: TemplateStringsArray, ...placeholders: any[]) {
  return dedent(literals, ...placeholders)
    .split("\n")
    .join(" \\\n");
}

export default function Page() {
  const endpoint = [
    process.env.NEXT_PUBLIC_FLAGS_ENDPOINT,
    process.env.NEXT_PUBLIC_FLAGS_ENV_KEY,
  ].join("/");

  return (
    <Layout title="Public API" flagBag={null}>
      <article className="py-4 prose max-w-prose">
        <p className="max-w-prose text-gray-600">
          This page describes the API used by <code>@happykit/flags</code>. You
          usually don't need to interact with this API. You will usually use the
          <code>@happykit/flags</code> client for Next.js applications. This API
          documentation is useful for people building clients for other
          frameworks, programming languages or devices.
        </p>
        <HelpBox />
        <h2>API Key</h2>
        <p>
          The public API does not need an API Key. Instead, you'll pass along
          what we call the Flag Key. This key identifies your project and the
          stage for which the flags will be resolved. Stages are explained in
          the next paragraph.
        </p>
        <h2>Stages</h2>
        <p>
          In most software projects you'll have a local development environment,
          one or multiple staging environments and a production deployment.
        </p>
        <p>
          HappyKit supports this approach to software development by natively
          supporting different stages. Flags share the variants across stages,
          but you can apply different targeting rules for each stage. You can
          further turn targeting on and off per stage.
        </p>
        <p>HappyKit supports the following stages</p>
        <ul>
          <li>
            <em>development</em> This stage is intended to be used during local
            development.
          </li>
          <li>
            <em>preview</em> This stage is intended for preview deployments.
          </li>
          <li>
            <em>production</em> This stage is intended for your production
            deployment.
          </li>
        </ul>
        <p>
          When calling the Public API, you'll pass along the Flags Key which
          contains the project id and the stage for which the flags will be
          resolved. You can not resolve flags for multiple stages in the same
          request.
        </p>
        <h2>Endpoint</h2>
        <p>
          Requests need to be sent as a <code>POST</code> request to:
          <code>https://happykit.dev/api/flags/&lt;flags key&gt;</code> You can
          find the <i>flag key</i> for each stage in your project's settings on{" "}
          <a href="https://happykit.dev/">happykit.dev</a>.
        </p>
        <p>Below is the simplest possible request:</p>
        <pre>{curl`curl -X "POST" "${endpoint}"`}</pre>
        The response would look something like
        <Response>
          {JSON.stringify(
            {
              flags: { ads: true, checkout: null, discount: 5 },
              visitor: null,
            },
            null,
            2
          )}
        </Response>
        <h2>Accepted body data</h2>
        <p>
          You can pass along information when triggering a flag evaluation,
          which your flags can use to decide which variant to evaluate to.
        </p>
        <h3>
          <code>visitorKey</code>
        </h3>
        <p>
          You can pass a key to identify a visitor. The visitor key is intended
          as a token which is stored in the browser of that device, and is
          intended to exist across any user sessions your application might
          have.
        </p>
        <p>
          You can use this visitor key to target visitors in their current
          browser. Here is an example request:
        </p>
        <pre>
          {curl`
              curl -X "POST" "${endpoint}"
              -H "content-type: application/json"
              -d '{ "visitorKey": "L37IX4EmqzIu37e0BI1Ku" }'
          `}
        </pre>
        <Response>
          {JSON.stringify(
            {
              flags: { ads: true, checkout: "short", discount: 5 },
              visitor: { key: "L37IX4EmqzIu37e0BI1Ku" },
            },
            null,
            2
          )}
        </Response>
        <p>
          A visitor key should always be passed along, except when you're doing
          static generation of pages. During static generation, the concept of a
          visitor does not exist. You can signal this by not providing a visitor
          key in the flag evaluation request body. All flags whose evaluation
          depends on the visitor key will then resolve to <code>null</code>{" "}
          instead. Once your visitors browser actually loads the site, you can
          send a second request with the visitor key present and receive the
          flags for an actual visitor. This mixed approach gives you full
          flexibility.
        </p>
        <h3>
          <code>user</code>
        </h3>
        <p>
          This field lets you specify a user object. Usually you'll use this to
          pass along the signed in user of your application. You can pass{" "}
          <code>null</code> or leave this field out completely in case no user
          is signed in. A user object may have the following fields:
        </p>
        <ul>
          <li>
            <code>key</code> <i>(string)</i> <i>(required)</i>: Unique key for
            this user
          </li>
          <li>
            <code>email</code> <i>(string)</i>: Email-Address
          </li>
          <li>
            <code>name</code> <i>(string)</i>: Full name or nickname
          </li>
          <li>
            <code>avatar</code> <i>(string)</i>: URL to users profile picture
          </li>
          <li>
            <code>country</code> <i>(string)</i>: Two-letter uppercase
            country-code, see{" "}
            <a
              href="https://en.wikipedia.org/wiki/ISO_3166-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              ISO 3166-1
            </a>
          </li>
        </ul>
        <p>Here is an exampe request</p>
        <pre>
          {curl`
              curl -X "POST" "${endpoint}"
              -H "content-type: application/json"
              -d '{ "user": { "key": "jane", "email": "jane@example.com" } }'
          `}
        </pre>
        <Response>
          {JSON.stringify(
            {
              flags: { ads: true, checkout: null, discount: 15 },
              visitor: null,
            },
            null,
            2
          )}
        </Response>
        <p>
          Your targeting rules can then use the passed user information. If you
          are looking to pass arbitrary data, try the <code>traits</code>{" "}
          feature shown below.
        </p>
        <h3>
          <code>traits</code>
        </h3>
        <p>
          Traits are any information you want to pass along to the flag
          targeting. They can relate to the visitor, user or anything else.
          Traits should be a flat object.
        </p>
        <p>
          An example would be to signal to your flags that the flags should be
          evaluated for a team member:
        </p>
        <pre>
          {curl`
              curl -X "POST" "${endpoint}"
              -H "content-type: application/json"
              -d '{ "traits": { "teamMember": true } }'
          `}
        </pre>
        <Response>
          {JSON.stringify(
            {
              flags: { ads: true, checkout: null, discount: 15 },
              visitor: null,
            },
            null,
            2
          )}
        </Response>
        <h3>
          <code>visitorKey</code>, <code>user</code> and <code>traits</code>
        </h3>
        <p>
          The examples above use the visitor, user and traits separately for
          clarity. In a real application, you'd probably end up using a mix of
          them - and thus passing a combination of those fields.
        </p>
        <h2>Responses</h2>
        <h3>General structure</h3>
        <p>
          The server responds with the status code 200 in case everything went
          alright. The response body will generally look like this:
        </p>
        <Response>
          {JSON.stringify(
            {
              flags: { ads: true, checkout: "short", discount: 5 },
              visitor: { key: "L37IX4EmqzIu37e0BI1Ku" },
            },
            null,
            2
          )}
        </Response>
        <h3>
          Flags resolving to <code>null</code>
        </h3>
        <p>
          In case a flag's resolution relies on information that was not
          provided in the request, the flag will resolve to <code>null</code>.
          This can happen when you try to do percentage rollouts based on the
          visitor key, but no <code>visitorKey</code> was present in the
          request.{" "}
        </p>
        <h3>
          <code>visitor</code>
        </h3>
        <p>
          The response contains information about the visitor. At the moment
          this is only the <code>visitor.key</code>.
        </p>
        <Response>
          {JSON.stringify(
            {
              flags: { ads: true, checkout: "short", discount: 5 },
              visitor: { key: "L37IX4EmqzIu37e0BI1Ku" },
            },
            null,
            2
          )}
        </Response>
        <p>
          The response will never set any cookies. It's your job to read the
          visitor key from the response and save it on the client. Provide it as
          the <code>visitorKey</code> on the next request of that visitor to
          ensure consistent targeting. If your initial request contained a{" "}
          <code>visitorKey</code> then the response's <code>visitor.key</code>{" "}
          will return the provided value.
        </p>
      </article>
    </Layout>
  );
}
