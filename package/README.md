<a id="nav">
  <img src="https://i.imgur.com/MS2Gtkj.png" width="100%" />
</a>

<div align="right">
  <a href="https://flags.happykit.dev/" target="_blank">Examples</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://medium.com/frontend-digest/using-feature-flags-in-next-js-c5c8d0795a2?source=friends_link&sk=d846a29f376acf9cfa41e926883923ab" target="_blank">Full Tutorial</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://happykit.dev/solutions/flags" target="_blank">happykit.dev</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://twitter.com/happykitdev" target="_blank">@happykitdev</a>
</div>

&nbsp;
&nbsp;

> Are you looking for the v2 docs? Find them [here](https://github.com/happykit/flags/tree/v2.0.7/package#readme)

Add Feature Flags to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Flags. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

**Key Features**

- written for Next.js
- integrate using a simple `useFlags()` hook
- only 2 kB gzipped size
- extremely fast flag responses (~50ms)
- supports *server-side rendering* and *static site generation*
- supports *middleware* and *edge functions*
- supports *user targeting*, *custom rules* and *rollouts*


<br />

---

<br />

- [Installation](#installation)
- [Setup](#setup)
  - [Prepare `flags` folder](#prepare-flags-folder)
    - [`flags/config.ts`](#flagsconfigts)
    - [`flags/client.ts`](#flagsclientts)
    - [`flags/server.ts`](#flagsserverts)
    - [`flags/edge.ts`](#flagsedgets)
  - [Absolute Imports](#absolute-imports)
  - [Setting up the Environment Variable](#setting-up-the-environment-variable)
- [Basic Usage](#basic-usage)
- [Exports](#exports)
- [`@happykit/flags` API](#happykitflags-api)
- [`flags` API](#flags-api)
  - [`config`](#config)
  - [`useFlags`](#useflags)
    - [`flagBag`](#flagbag)
    - [Supported user attributes](#supported-user-attributes)
    - [`getFlags`](#getflags)
  - [`getEdgeFlags`](#getedgeflags)
- [Advanced Usage](#advanced-usage)
  - [With user targeting](#with-user-targeting)
  - [Configuring application-wide default values](#configuring-application-wide-default-values)
  - [With server-side rendering (hybrid)](#with-server-side-rendering-hybrid)
  - [With server-side rendering (pure)](#with-server-side-rendering-pure)
  - [With static site generation (hybrid)](#with-static-site-generation-hybrid)
  - [With static site generation (client only)](#with-static-site-generation-client-only)
  - [With static site generation (pure)](#with-static-site-generation-pure)
  - [With disabled revalidation](#with-disabled-revalidation)
  - [With custom storage](#with-custom-storage)
  - [With same domain evaluations](#with-same-domain-evaluations)
- [Examples](#examples)
  - [Full example](#full-example)
  - [TypeScript example](#typescript-example)
    - [Default Types](#default-types)
    - [Custom Flag Type](#custom-flag-type)
  - [Code splitting](#code-splitting)
  - [Middleware example](#middleware-example)
- [FAQs](#faqs)
  - [Why should I only ever render the `useFlags` hook once per page?](#why-should-i-only-ever-render-the-useflags-hook-once-per-page)

<br />

## Installation

```
npm install @happykit/flags
```

## Setup

`@happykit/flags` exports factory functions like `createGetFlags` and `createUseFlags`. You'll call these factory functions once within your application to create the actual `getFlags` and `useFlags` functions the rest of your application will use. This allows you to share the same configuration and types across all functions.

The boilerplate is further split into multiple files. This is necessary due to how Next.js bundling works. Having separte files allows shipping minimal code to the client.

### Prepare `flags` folder

Create a `flags` folder at the root of your project.

Put the files create the files listed below within the `flags` folder you just created:

#### `flags/config.ts`

```ts
import type { Configuration } from "@happykit/flags/config";

// You can replace this with your exact flag types
export type AppFlags = { [key: string]: boolean | number | string | null };

export const config: Configuration<AppFlags> = {
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,

  // You can provide defaults flag values here
  defaultFlags: {}, 
};
```

#### `flags/client.ts`

```ts
import {
  createUseFlags,
  type InitialFlagState as GenericInitialFlagState,
} from "@happykit/flags/client";
import { createUseFlagBag } from "@happykit/flags/context";
import { type AppFlags, config } from "./config";

export type InitialFlagState = GenericInitialFlagState<AppFlags>;
export const useFlags = createUseFlags<AppFlags>(config);
export const useFlagBag = createUseFlagBag<AppFlags>();
```

#### `flags/server.ts`

```ts
import {
  createGetFlags,
  type GenericEvaluationResponseBody,
} from "@happykit/flags/server";
import { type AppFlags, config } from "./config";

export type EvaluationResponseBody = GenericEvaluationResponseBody<AppFlags>;
export const getFlags = createGetFlags<AppFlags>(config);
```

#### `flags/edge.ts`

```ts
import { createGetEdgeFlags } from "@happykit/flags/edge";
import { type AppFlags, config } from "./config";

export const getEdgeFlags = createGetEdgeFlags<AppFlags>(config);
```

### Absolute Imports

It's recommended to enable [Absolute Imports](https://nextjs.org/docs/advanced-features/module-path-aliases) in your Next.js application.

This will allow you to later import your flags like

```ts
import { useFlag } from "flags/client"
```

instead of having to use relative imports like

```ts
import { useFlag } from "../../../flags/client"
```


### Setting up the Environment Variable

You might have noticed that `flags/config.ts` uses an Environment Variable called `
`. This variable is used to tell HappyKit which flags it should use. Let's set this up now.

Create an account on [`happykit.dev`](https://happykit.dev/signup) to receive your `envKey`. You'll find it in the **Keys** section of your project settings once you created a project.

Make sure the environment variable containing the `envKey` starts with `NEXT_PUBLIC_` so the value is available on the client side.

Store your `envKey` in `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_FLAGS_ENV_KEY=flags_pub_development_xxxxxxxxxx
```

Later on, don't forget to also provide the environment variable in production.

> There's also [a full walkthrough of the setup](https://medium.com/frontend-digest/using-feature-flags-in-next-js-c5c8d0795a2?source=friends_link&sk=d846a29f376acf9cfa41e926883923ab), which explains the setup in your project and in HappyKit Flags itself.


That's it. You're now ready to use your first feature flag.

## Basic Usage

You can load flags on the client with a single `useFlags` call.

```js
// pages/foo.js
import { useFlags } from "flags/client";

export default function FooPage(props) {
  const { flags } = useFlags();
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

Or with server-side rendering

```js
// pages/foo.js
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";

export const getServerSideProps = async (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const { flags } = useFlags({ initialState: props.initialFlagState });
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

> Note that you should only ever call `useFlags()` once per Next.js page to avoid causing multiple requests and inconsistent flags.
>
> See more about this in the [FAQs](#why-should-i-only-ever-render-the-useflags-hook-once-per-page).


## Exports

`@happykit/flags` offers multiple entrypoints:
- `@happykit/flags/config`: Configuration functions
- `@happykit/flags/server`: Use flags in `getServerSideProps` & `getStaticProps`
- `@happykit/flags/client`: Use flags on the client
- `@happykit/flags/edge`: Use flags in Middleware and Edge API Routes
- `@happykit/flags/context`: A helper to pass the `flagBag` down through React's context

## `@happykit/flags` API

After setting up your `flags` folder you will not interact with `@happykit/flags` much. Instead, your application will import from your `flags` folder. That's why the API of `@happykit/flags` is not described in more detail here. It has extensive JSDoc if you want to dig deep.

## `flags` API

This section describes the exports of your `flags` folder.

### `config`

*exported from `flags/config`*

Exports a `config` object which is shared across all runtimes (server, client, edge).

- `config`
  - `config.envKey` _(string)_ _required_: Your HappyKit Flags Client Id
  - `config.defaultFlags = undefined` _(object)_ _optional_: Key-value pairs of flags and their values. These values are used as fallbacks in `useFlags` and `getFlags`. The fallbacks are used while the actual flags are loaded, in case a flag is missing or when the request loading the flags fails for unexpected reasons. If you don't declare `defaultFlags`, then the flag values will be `undefined`.
  - `config.endpoint = "https://happykit.dev/api/flags"` _(string)_ _optional_: The endpoint to load flags from. This does not usually need to be changed.


### `useFlags`

*exported from `flags/client`*

This hook loads the flags on the client.

> **This hook should only ever be rendered once per page.**

- `useFlags(options)`
  - `options.user` _(object)_ _optional_: A user to load the flags for. A user must at least have a `key`. See the supported user attributes [here](#supported-user-attributes). The user information you pass can be used for [individual targeting](#with-user-targeting) or rules.
  - `options.traits` _(object)_ _optional_: An object which you have access to in the flag's rules. You can target users based on traits.
  - `options.initialState` _(object)_ _optional_: In case you preloaded your flags during server-side rendering using `getFlags()`, provide the returned state as `initialState`. The client will then skip the first request whenever possible and use the provided flags instead. This allows you to get rid of loading states and on the client.
  - `options.revalidateOnFocus` _(object)_ _optional_: By default the client will revalidate all feature flags when the browser window regains focus. Pass `revalidateOnFocus: false` to skip this behaviour.
  - `options.pause` _(boolean)_ _optional_: Set this to `true` to delay fetching of the passed inputs. This is useful in case you need to wait for your `user` or `traits` to be loaded before kicking off the feature flag evaluation request.
  - `options.clientLoadingTimeout = 3000` _(number)_ _optional_: A timeout in milliseconds after which any client-side evaluation requests will be aborted. Pass `false` to disable this feature. This feature is only supported in [browsers which support](https://caniuse.com/abortcontroller) the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController). Overwrites `config.clientLoadingTimeout`.


The `useFlags` function returns an object called [`flagBag`](#flagBag). The returned `flagBag` is described [below](#flagbag).

#### `flagBag`

This object is returned from `useFlags()`.

- `flags` _(object | null)_: The feature flags, with the defaults applied.
- `data` _(object | null)_: The feature flags as loaded from HappyKit, with no defaults applied. `null` if an error occurred while loading.
- `error` _(string | null)_: A string describing the error that occurred while loading the feature flags, null otherwise.
- `visitorKey` _(string | null)_: The visitor key the feature flags were fetched for.
- `settled` _(boolean)_: Unless you are providing `initialState`, the client will need to fetch the feature flags from the API on mount. In some cases, during static site generation, it will even need to fetch the feature flags from the API even though you provided `initialState`. The `settled` value will turn `true` once the flags have settled on the client. This means that the only way for the value of the flags to change from then on would be if you changed one of the feature flag definitions, or provided different inputs (`user`, `traits`). Once `settled` has turned true, it will not turn back to false. You can use `settled` in case you want to wait for the "final" feature flag values before kicking of code splitting.
- `fetching` _(boolean)_: This is `true` whenever the client is loading feature flags. This might happen initially, on rerenders with changed inputs (`user`, `traits`) or when the window regains focus and revaldiation is triggered. You probably want to use `settled` instead, as `settled` stays truthy once the flags were loaded, while `fetching` can flip multiple times.
- `revalidate` _(function)_: A function you can call to revalidate the flags based on the values currently passed into the `useFlags` hook.

#### Supported user attributes

Provide any of these attributes to store them in HappyKit. You will be able to use them for targeting specific users based on rules later on (_not yet available in HappyKit Flags_).

- `key` _(string)_ _required_: Unique key for this user
- `email` _(string)_: Email-Address
- `name` _(string)_: Full name or nickname
- `avatar` _(string)_: URL to users profile picture
- `country` _(string)_: Two-letter uppercase country-code of user's county, see [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1)


#### `getFlags`

*exported from `flags/server`*

- `getFlags(options)`
  - `options.context` _(object)_ _required_: The context which you receive from `getStaticProps` or `getServerSideProps`.
  - `options.user` _(object)_ _optional_: Same as `user` in `useFlags()`. If pass a user here, make sure to pass the same user to `useFlags({ user })`.
  - `options.traits` _(object)_ _optional_: Same as `traits` in `useFlags()`. If pass traits here, make sure to pass the same traits to `useFlags({ traits })`.
  - `options.loadingTimeout` _(number)_ _optional_: A timeout in milliseconds after which any server-side or static evaluation requests will be aborted. Pass `false` to disable this feature. Overwrites `config.serverLoadingTimeout` or `config.staticLoadingTimeout` depending on whether you're `getFlags` is used in side of `getServerSideProps`, `getStaticProps` or `getStaticPaths`.

This function returns a promise resolving to an object that looks like this:

```ts
{
  // Evaluated flags, combined with the configured fallbacks
  flags: object | null,
  // Flags as loaded from the API (no fallbacks applied)
  data: object | null;
  // Evaluated flags, as loaded from the API (no fallbacks applied)
  error: string | null,
  // The preloaded state, which can be provided to useFlags({ initialState })
  initialFlagState: object
}
```

### `getEdgeFlags`

*exported from `flags/edge`*

This function is meant to be used from [Next.js Middleware](https://nextjs.org/docs/middleware) (`middleware` files) and [Edge API Routes](https://nextjs.org/docs/api-routes/edge-api-routes).

*exported from `@happykit/flags/edge`*

- `getEdgeFlags(options)`
  - `options.request` _(NextRequest)_ _required_: The Next.js Request.
  - `options.user` _(object)_ _optional_: Same as `user` in `useFlags()`. If pass a user here, make sure to pass the same user to `useFlags({ user })`.
  - `options.traits` _(object)_ _optional_: Same as `traits` in `useFlags()`. If pass traits here, make sure to pass the same traits to `useFlags({ traits })`.
  

This function returns a promise resolving to an object that looks like this:

```ts
{
  // Evaluated flags, combined with the configured fallbacks
  flags: object | null,
  // Flags as loaded from the API (no fallbacks applied)
  data: object | null;
  // Evaluated flags, as loaded from the API (no fallbacks applied)
  error: string | null,
  // The preloaded state, which can be provided to useFlags({ initialState })
  initialFlagState: object,
  // Use this to set the response cookie from the middleware 
  // with `response.cookie(...cookie.args)`
  cookie: null | {
    name: string;
    value: string;
    options: object;
    args: [string, string, object];
  }
}
```


## Advanced Usage

### With user targeting

You can provide a `user` as the first argument. Use this to enable per-user targeting of your flags. A `user` must at least have a `key` property.

```js
// pages/foo.js
import { useFlags } from "flags/client";

export default function FooPage(props) {
  const flagBag = useFlags({ user: { key: 'user-id' } });
  return flagBag.flags.greeting === "dog" ? "Woof" : "Hello";
}
```

<details>
<summary>See here if you're using server-side rendering</summary>

Or if you're using [prerendering](#with-server-side-rendering)

```js
// pages/foo.js
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";

export const getServerSideProps = async (context) => {
  const user = { key: 'user-id' };
  const { initialFlagState } = await getFlags({ context, user });
  return { props: { user, initialFlagState } };
};

export default function FooPage(props) {
  const flagBag = useFlags({
    user: props.user,
    initialState: props.initialFlagState,
  });

  return flagBag.flags.greeting === "dog" ? "Woof" : "Hello";
}
```

</details>

[See all supported user attributes](#supported-user-attributes)

<br />

### Configuring application-wide default values

You can configure application-wide default values for flags. These defaults will be used while your flags are being loaded (unless you're using server-side rendering). They'll also be used as fallback values in case the flags couldn't be loaded from HappyKit.

To do so, pass `defaultFlags` to the `configure` call in `flags/config.ts`.

```ts
// flags/config.ts (shortened)
import type { Configuration } from "@happykit/flags/config";

export const config: Configuration<AppFlags> = {
  // You can provide defaults here
  defaultFlags: {
    greeting: "dog",
    // .. more defaults ..
  }, 
  // .. other settings ..
});
```

### With server-side rendering (hybrid)

Setting initial flag values enables rehydration when using server-side rendering. When you pass in `initialState` the flags will be available on the client immediately.

`useFlags` then reuses the passed in state, and skips the evaluation network request it would otherwise do initially.

```js
// pages/foo.js
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";

export const getServerSideProps = async (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const flagBag = useFlags({ initialState: props.initialFlagState });
  return flagBag.flags.greeting === "dog" ? "Woof" : "Hello";
}
```

### With server-side rendering (pure)

You don't even need to call `useFlags` if you don't want to revalidate the flags on the client.

```js
// pages/foo.js
import { getFlags } from "flags/server";

export const getServerSideProps = async (context) => {
  const { flags } = await getFlags({ context });
  return { props: { flags } };
};

export default function FooPage(props) {
  return props.flags.greeting === "dog" ? 'Woof' : 'Hello';
}
```

### With static site generation (hybrid)

You can pass in the initial state from static site generation. `useFlags` will then revalidate the flags on mount with the complete information.

Static renders do not have any information about the visitor and any flags using the visitor information will thus evaluate to `null`. They will contain actual values once the client revalidates them. The `flagBag.settled` prop will then switch to `true` once the returned flags are final.

```js
// pages/foo.js
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";

export const getStaticProps = (context) => {
  const initialFlagState = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const flagBag = useFlags({ initialState: props.initialFlagState });
  return flagBag.flags.greeting === "dog" ? "Woof" : "Hello";
}
```

### With static site generation (client only)

You can also call `useFlags` in client-side rendering mode on static pages without passing in any initial state.

```js
// pages/foo.js
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";

export const getStaticProps = (context) => {
  return { props: { somethingUnrelated: true } };
};

export default function FooPage(props) {
  const flagBag = useFlags();
  return flagBag.flags.greeting === "dog" ? "Woof" : "Hello";
}
```

### With static site generation (pure)

You don't even need to use `useFlags` in case you're regenerating your site on flag changes anyways.

> Protip: HappyKit can trigger a redeployment of your site when you change your flags by calling a [Deploy Hook](https://vercel.com/docs/more/deploy-hooks) you specify. Or you can go a step further and even combine these hooks with [On-Demand ISR](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration#using-on-demand-revalidation).

```js
// pages/foo.js
import { getFlags } from "flags/server";

export const getStaticProps = () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};

export default function FooPage(props) {
  return props.flags.greeting === "dog" ? 'Woof' : 'Hello';
}
```

_The upside of this approach is that `useFlags` isn't even shipped to the client. This keeps the page extremly small, as no client-side JS is added. You will also have no Layout Shift._

_For use with `getStaticProps` the downside is that the new flags are only available once your site is redeployed. You can trigger redeployments on flag changes with Deploy Hooks on happykit.dev using Deploy Hooks._

_Note that when you use `getFlags()` with `getStaticProps` the static generation phase has no concept of a visitor, so rollouts based on visitor information are not possible. You can still use `getStaticProps`, but you should also use `useFlags()` on the client in such cases._

_For use with `getServerSideProps` the downside of not passing the flags through to `useFlags()` is that flag changes are only shown when the page is reloaded._

### With disabled revalidation

`useFlags` uses the browser's [`visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) event to revalidate feature flags when the active window regains visibility. If you explicitly set `revalidateOnFocus` to `false`, then HappyKit will no longer revalidate on visibility changes. This can be useful if you want to reduce the number of requests to HappyKit. `useFlags` will still revalidate if you its inputs change (e.g. you supply a different user).

```js
// pages/foo.js
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";

export const getServerSideProps = (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const flagBag = useFlags({
    revalidateOnFocus: false,
    initialState: props.initialFlagState
  });

  return flagBag.flags.greeting === "dog" ? "Woof" : "Hello";
}
```

### With custom storage

> Please get in touch with me before attempting to follow this section.
> It is not yet showing all steps necessary as the systems involved are not
> fully released.

By default `@happykit/flags` evaluates your feature flags by sending a request to [HappyKit's Public API](https://flags.happykit.dev/docs/public-api).

This means your application needs to contact HappyKit. These APIs are already extremely fast. But you can squeeze out a bit more if you have a faster way to provide the definitions to your application.

Let's assume you have storage which your application can access at extremely low latency. This system holds your feature flag definitons. Let's also assume every time you change your feature flags on happykit.dev, the latest flag definitions get written into your storage.

You can then tell `@happykit/flags` to load your feature flag definitions from your magical ultra low latency storage and evaluate the feature flags in your own application.

Create a file called `flags/storage.ts`:

```ts
import type { GetDefinitions, Definitions } from "@happykit/flags/api-route";

export const getDefinitions: GetDefinitions = async (
  projectId,
  envKey,
  environment
) => {
  const definitions = /* load your feature flag definitions from somewhere */;
  return definitions ?? null;
};
```

This file controls how your feature flag definitions are loaded.

You can now pass the `getDefinitions` method to `getFlags` and `getEdgeFlags` factories.

Make this change in `flags/server.ts`:

```diff
-export const getFlags = createGetFlags<AppFlags>(config);
+export const getFlags = createGetFlags<AppFlags>(config, { getDefinitions });
```

And make this change in `flags/edge.ts`

```diff
-export const getEdgeFlags = createGetEdgeFlags<AppFlags>(config);
+export const getEdgeFlags = createGetEdgeFlags<AppFlags>(config, { getDefinitions });
```

Now `@happykit/flags` will load your feature flag definitions from your own storage every time you use `getFlags` or `getEdgeFlags`.

*In theory you could commit a file to your own repository containing HappyKit's feature flag definitions and load this json from `getDefinitions`. This would give you feature flags at 0 latency.*

*The downside would be that updates to your flags would require a redeployment, and that changes would not affect other preview deployments.*

### With same domain evaluations

> Please get in touch with me before attempting to follow this section.
> It is not yet showing all steps necessary as the systems involved are not
> fully released.

When you use client-side feature flags your user's browser needs to connect to happykit.dev to evaluate the feature flags. This DNS lookup takes a bit of time. What if you could evaluate feature flags on your own domain? Then you'd save the DNS lookup.

This is what `@happykit/flags/api-route` allows you to do.

This assumes you have created a `flags/storage.ts` file as shown in [With custom storage](#with-custom-storage).

Create a file called `pages/api/flags/[envKey].ts` and fill it with this content:

```ts
import { createApiRoute } from "@happykit/flags/api-route";
import { getDefinitions } from "flags/storage";

export const config = { runtime: "experimental-edge" };

export default createApiRoute({ getDefinitions });
```

This creates an [Edge API Route](https://nextjs.org/docs/api-routes/edge-api-routes) which can evaluate feature flags on your own domain at `/api/flags/:envKey`.

You can now reconfigure your application to evaluate your client-side flags on your own domain at `/api/flags` instead of querying happykit.dev. To do so, change your endpoint in `flags/config.ts` to a relative path:

```ts
// flags/config.ts
export const config: Configuration<AppFlags> = {
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,
  endpoint: "/api/flags", // <-- add this line
};
```

Your client is now evaluating flags on your own domain.

## Examples

### Full example

This demo shows the full configuration with server-side rendering and code splitting.

`useFlags` will resolve flags from the cache while it revalidates the flags in the background. This means that flags might flip from one value to another after the initial render in case the cache is outdated.

You can use a property called `settled` which turns `true` once the flags are freshly validated from the server. Using this property allows you to ensure flags are fresh before kicking off a heavier task like loading a component via code splitting.

> Note: This example does not include the setup of your `flags` folder.


```js
// pages/profile.js
import * as React from 'react';
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('components/profile-a'));
const ProfileVariantB = dynamic(() => import('components/profile-b'));


export const getServerSideProps = async (context) => {
  // preload your user somehow
  const user = await getUser(context.req);

  // pass the user to getFlags to preload flags for that user
  const { initialFlagState } = await getFlags({ context, user });

  return { props: { user, initialFlagState } };
};

export default function Page(props) {
  const flagBag = useFlags({
    user: props.user,
    initialState: props.initialFlagState,
  });

  // The flags will always start as settled when you pass
  // in initialState from `getServerSideProps`.
  // When you use `getStaticProps`, the flags will not
  // start as settled, since static rendering has no concept
  // of a visitor.
  //
  // So the check for "settled" is unnecessary in this example,
  // but useful if you want to use `getStaticProps`.
  if (!flagBag.settled) return null

  return flagBag.flags?.profileVariant === 'A' ? (
    <ProfileVariantA user={props.user} />
  ) : (
    <ProfileVariantB user={props.user} />
  );
}
```

### TypeScript example

#### Default Types

`@happykit/flags` includes type definitions. By default, flags returned from `useFlags` and `getFlags` have the following type:

```ts
type Flags = { [key: string]: boolean | number | string | null };
```

You can use `@happykit/flags` without further configuration and get pretty good types.

#### Custom Flag Type

However, all exported functions accept an optional generic type, so you can harden your flag definitions by defining a custom flag type. This allows you to define flag values explicitily.

```ts
// flags/config.ts

// Define the types of your app's flags
export type AppFlags = {
  booleanFlag: boolean;
  numericFlag: number;
  textualFlag: string;
  // You can lock textual and numeric flag values down even more, since
  // you know all possible values:
  // numericFlag: 0 | 10;
  // textualFlag: 'profileA' | 'profileB';
};
```

When you open your project on [happykit.dev](https://happykit.dev/),
 you can go to Flags > Types to generate your `AppFlags` types.

### Code splitting

> Note that while this approach works, you might be better off
> using Middleware as shown in the next section.

If you have two variants of a page and you only want to render one depending on a feature flag, you're able to keep the client-side bundle small by using dynamic imports.

```js
import * as React from 'react';
import { useFlags } from "flags/client";
import { getFlags } from "flags/server";
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('../components/profile-a'));
const ProfileVariantB = dynamic(() => import('../components/profile-b'));

export default function Page(props) {
  const flagBag = useFlags({ user: { key: 'user_id_1' } });

  // display nothing until we know for sure which variants the flags resolve to
  if (!flagBag.settled) return null;

  return flagBag.flags?.profileVariant === 'A' ? (
    <ProfileVariantA user={props.user} />
  ) : (
    <ProfileVariantB user={props.user} />
  );
}
```

You can even go one step further and preload the flags on the server, so that the client receives a prerenderd page.

Notice that the loading state is gone with that as well, since the flags are available upon the first render. Your app will also not suffer from Layout Shift.

```js
// with server-side flag preloading
import * as React from 'react';
import { useFlags } from 'flags/client';
import { getFlags } from 'flags/server';
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('components/profile-a'));
const ProfileVariantB = dynamic(() => import('components/profile-b'));


export const getServerSideProps = async (context) => {
  // preload your user somehow
  const user = await getUser(context.req);
  // pass the user to getFlags to preload flags for that user
  const { initialFlagState } = await getFlags({ context, user });

  return { props: { user, initialFlagState } };
};

export default function Page(props) {
  const flagBag = useFlags({
    user: props.user,
    initialState: props.initialFlagState,
  });

  return flagBag.flags?.profileVariant === 'A' ? (
    <ProfileVariantA user={props.user} />
  ) : (
    <ProfileVariantB user={props.user} />
  );
}
```

*This technique of removing the loading state works only with `getServerSideProps`. If you use `getStaticProps`, the server has no concept of the current visitor, but a visitor could influence flag rollouts. The client thus needs to reevaluate the flags and will only settle (pass `settled: true`) once the client-side reevaluation has completed.*



### Middleware example

You can use `getEdgeFlags` from `flags/edge` to evaluate flags from the [Next.js Middleware](https://nextjs.org/docs/middleware).

A fully configured middleware could look like this:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getEdgeFlags } from "flags/edge";

export async function middleware(request: NextRequest) {
  const flagBag = await getEdgeFlags<AppFlags>({ request });

  // Use the flagBag result to run a static rewrite
  const response = NextResponse.rewrite(
    `/demo/middleware/variant-${flagBag.flags?.checkout || "full"}`
  );

  if (flagBag.cookie) response.cookie(...flagBag.cookie.args);

  return response;
}
```

A new property of `getEdgeFlags` is `flagBag.cookie`. This is set whenver the flag response contains a visitor key. You must then manually set the cookie on the response so the visitor can be reidentified on the next page load.

One way to do that would be to use

```ts
if (flagBag.cookie) {
  response.cookie(
    flagBag.cookie.name,
    flagBag.cookie.value,
    flagBag.cookie.options,
  )
}
```

There is a shortcut to make this more concise:

```ts
if (flagBag.cookie) response.cookie(...flagBag.cookie.args)
```

`flagBag.cookie.args` is an array that contains `[cookie.name, cookie.value, cookie.options]`, so `cookie.args` can simply be applied onto `response.cookie`.

Both of these methods of using `flagBag.cookie` set a cookie called `hkvk` on the client which contians the automatically generated visitor key.

You can see this example in action at [flags.happykit.dev/demo/middleware](https://flags.happykit.dev/demo/middleware).


## FAQs

### Why should I only ever render the `useFlags` hook once per page?

The `useFlags()` hook handles loading of the feature flags. Since HappyKit supports all rendering modes (server-side rendering, client-side rendering, static site generation) each individual Next.js page route can use a different way to load flags.

Some pages might use pure client-side rendering, others might use server-side rendering or static site generation.

Depending on the rendering mode, you might need to pass some `initialState` to the `useFlags()` hook. The best place to do this is right inside the Next.js page, at the top level.

From there it's best to pass the returned `flagBag` to each component that needs it.

You can do so directly or by using `@happykit/flags/context`. 

This allows you to switch between flags, and prevents you from calling `useFlags()` with inconsistent values on the same page. Only calling `useFlags()` once per page ensures you'll see the same feature flags on the whole page.
