import * as React from "react";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";

export default function Page() {
  return (
    <Layout title="Docs: Public API">
      <article className="py-4 prose max-w-prose">
        <p className="max-w-prose text-gray-600">
          This page describes the API used by <code>@happykit/flags</code>. You
          usually don't need to interact with this API. You will usually use the
          <code>@happykit/flags</code> client for Next.js applications. This API
          documentation is useful for people building clients for other
          frameworks, programming languages or devices.
        </p>
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
          <pre>https://happykit.dev/api/flags/&lt;flags key&gt;</pre> You can
          find the <i>flag key</i> for each stage in your project's settings on{" "}
          <a href="https://happykit.dev/">happykit.dev</a>.
        </p>
        <p>Below is the simplest possible request:</p>
        <pre>
          curl -X &quot;POST&quot;
          &quot;http://localhost:8787/api/flags/flags_pub_272357356657967622&quot;
          \
          <br />
          -H &#39;content-type: application/json&#39;
        </pre>
        <h2>Accepted body data</h2>
        <p>
          You can pass along information when triggering a flag evaluation,
          which your flags can use to decide which variant to evaluate to.
        </p>
        <h3>
          <code>visitor</code>
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
          curl -X &quot;POST&quot;
          &quot;http://localhost:8787/api/flags/flags_pub_272357356657967622&quot;
          \
          <br />
          -H &#39;content-type: application/json&#39; \
          <br />
          -d $&#39;&#123; &quot;visitorKey&quot;:
          &quot;L37IX4EmqzIu37e0BI1Ku&quot; &#125;&#39;
        </pre>
        <p>
          A visitor key should always be passed along, except when you're doing
          static generation of pages. During static generation, the concept of a
          visitor does not exist. You can signal this by not providing a visitor
          key in the flag evaluation request body. All flags whose evaluation
          depends on the visitor key will then resolve to <code>null</code>{" "}
          instead.
        </p>
        <h3>
          <code>user</code>
        </h3>
        <h3>
          <code>traits</code>
        </h3>

        <h2>Responses</h2>
      </article>
    </Layout>
  );
}
