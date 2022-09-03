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

Add Feature Flags to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Flags. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

**Key Features**

- written for Next.js
- integrate using a simple `useFlags()` hook
- only 5 kB in size
- extremely fast flag responses (~50ms)
- supports *user targeting*, *custom rules* and *rollouts*
- supports *server-side rendering* and *static site generation*
- supports *middleware (edge functions)*


<br />

---

<br />

- [Installation](#installation)
- [Setup](#setup)
- [Basic Usage](#basic-usage)
- [Exports](#exports)
- [API](#api)
  - [`configure`](#configure)
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

Configure your application by creating `flags.config.js` in  your root folder.


```js
// flags.config.js
import { configure } from "@happykit/flags/config";

configure({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY
});
```


Import your configuration in `_app.js`.

```js
// pages/_app.js
import '../flags.config'
```

If you don't have a custom `_app.js` yet, see the [Custom `App`](https://nextjs.org/docs/advanced-features/custom-app) section of the Next.js docs for setup instructions.

Create an account on [`happykit.dev`](https://happykit.dev/signup) to receive your `envKey`. You'll find it in the **Keys** section of your project settings once you created a project.

Make sure the environment variable containing the `envKey` starts with `NEXT_PUBLIC_` so the value is available on the client side.

Store your `envKey` in `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY=flags_pub_development_xxxxxxxxxx
```

Later on, don't forget to also provide the environment variable in production.

> There's also [a full walkthrough of the setup](https://medium.com/frontend-digest/using-feature-flags-in-next-js-c5c8d0795a2?source=friends_link&sk=d846a29f376acf9cfa41e926883923ab), which explains the setup in your project and in HappyKit Flags itself.

## Basic Usage

You can load flags on the client with a single `useFlags` call.

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";

export default function FooPage(props) {
  const { flags } = useFlags();
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

Or with server-side rendering

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

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

`@happykit/flags` offers multiple entrypoints to keep the bundle small:
- `@happykit/flags/config`: Configuration functions
- `@happykit/flags/server`: Everything related to the server
- `@happykit/flags/client`: Everything related to the client
- `@happykit/flags/context`: A helper to pass the `flagBag` down through React's context

## API

### `configure`

*exported from `@happykit/flags/config`*

- `configure(options)`
  - `options.envKey` _(string)_ _required_: Your HappyKit Flags Client Id
  - `options.defaultFlags = undefined` _(object)_ _optional_: Key-value pairs of flags and their values. These values are used as fallbacks in `useFlags` and `getFlags`. The fallbacks are used while the actual flags are loaded, in case a flag is missing or when the request loading the flags fails for unexpected reasons. If you don't declare `defaultFlags`, then the flag values will be `undefined`.
  - `options.endpoint = "https://happykit.dev/api/flags"` _(string)_ _optional_: The endpoint to load flags from. This does not usually need to be changed.
  - `options.clientLoadingTimeout = 3000` _(number)_ _optional_: A timeout in milliseconds after which any client-side evaluation requests from `useFlags` will be aborted. Pass `false` to disable this feature. This feature is only supported in [browsers which support](https://caniuse.com/abortcontroller) the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
  - `options.serverLoadingTimeout = 3000` _(number)_ _optional_: A timeout in milliseconds after which any server-side evaluation requests from `getFlags` inside of `getServerSideProps` will be aborted. Pass `false` to disable this feature.
  - `options.staticLoadingTimeout = 60000` _(number)_ _optional_: A timeout in milliseconds after which any static evaluation requests from `getFlags` inside of `getStaticProps` or `getStaticPaths` will be aborted. Pass `false` to disable this feature.


### `useFlags`

*exported from `@happykit/flags/client`*

This hook loads the flags on the client.

> **This hook should only ever be rendered once per page.**

- `useFlags(options)`
  - `options.user` _(object)_ _optional_: A user to load the flags for. A user must at least have a `key`. See the supported user attributes [here](#supported-user-attributes). The user information you pass can be used for [individual targeting](#with-user-targeting) or rules.
  - `options.traits` _(object)_ _optional_: An object which you have access to in the flag's rules. You can target users based on traits.
  - `options.initialState` _(object)_ _optional_: In case you preloaded your flags during server-side rendering using `getFlags()`, provide the returned state as `initialState`. The client will then skip the first request whenever possible and use the provided flags instead. This allows you to get rid of loading states and on the client.
  - `options.revalidateOnFocus` _(object)_ _optional_: By default the client will revalidate all feature flags when the browser window regains focus. Pass `revalidateOnFocus: false` to skip this behaviour.
  - `options.pause` _(boolean)_ _optional_: Set this to `true` to delay fetching of the passed inputs. This is useful in case you need to wait for your `user` or `traits` to be loaded before kicking off the feature flag evaluation request.
  - `options.loadingTimeout` _(number)_ _optional_: A timeout in milliseconds after which any client-side evaluation requests will be aborted. Pass `false` to disable this feature. This feature is only supported in [browsers which support](https://caniuse.com/abortcontroller) the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController). Overwrites `config.clientLoadingTimeout`.

The `useFlags` function returns an object we usually call [`flagBag`](#flagBag). The returned `flagBag` is described [below](#flagbag).

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

### `getFlags`

*exported from `@happykit/flags/server`*

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

This function is meant to be used from [Next.js Middleware](https://nextjs.org/docs/middleware) (`middleware` files).

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
import { useFlags } from "@happykit/flags/client";

export default function FooPage(props) {
  const flagBag = useFlags({ user: { key: 'user-id' } });
  return flagBag.flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

<details>
<summary>See here if you're using server-side rendering</summary>

Or if you're using [prerendering](#with-server-side-rendering)

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

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

  return flagBag.flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

</details>

[See all supported user attributes](#supported-user-attributes)

<br />

### Configuring application-wide default values

You can configure application-wide default values for flags. These defaults will be used while your flags are being loaded (unless you're using server-side rendering). They'll also be used as fallback values in case the flags couldn't be loaded from HappyKit.

```js
// flags.config.js
import { configure } from "@happykit/flags/config";

configure({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY,
  defaultFlags: { xzibit: true },
});
```

### With server-side rendering (hybrid)

Being able to set initial flag values is what enables rehydration when using server-side rendering. When you pass in `initialState` the flags will be set from the beginning. This is avoids the first request on the client.

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

export const getServerSideProps = async (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const { flags } = useFlags({ initialState: props.initialFlagState });
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With server-side rendering (pure)

You don't even need to call `useFlags` if you don't want to revalidate the flags on the client.

```js
// pages/foo.js
import { getFlags } from "@happykit/flags/server";

export const getServerSideProps = async (context) => {
  const { flags } = await getFlags({ context });
  return { props: { flags } };
};

export default function FooPage(props) {
  return props.flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With static site generation (hybrid)

You can pass in the initial state from static site generation. `@happykit/flags` will then revalidate the flags on mount with the complete information.

Static renders do not have any information about the visitor and any flags using the visitor information will thus evaluate to `null`. They will contain actual values once the client revalidates them. The `flagBag.settled` prop will then switch to `true` once the returned flags are final.

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

export const getStaticProps = (context) => {
  const initialFlagState = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const { flags } = useFlags({ initialState: props.initialFlagState });
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With static site generation (client only)

You can also use `@happykit/flags` in client-side rendering mode on static pages by just not passing in any initial state.

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

export const getStaticProps = (context) => {
  return { props: { somethingUnrelated: true } };
};

export default function FooPage(props) {
  const { flags } = useFlags();
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With static site generation (pure)

You don't even need to use `useFlags` in case you're regenerating your site on flag changes anyways.

HappyKit will soon be able to trigger redeployment of your site when you change your flags by calling a [Deploy Hook](https://vercel.com/docs/more/deploy-hooks) you specify.

```js
// pages/foo.js
import { getFlags } from "@happykit/flags/server";

export const getStaticProps = () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};

export default function FooPage(props) {
  return props.flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

_The upside of this approach is that `useFlags` isn't even shipped to the client. This keeps the page extremly small, as no client-side JS is added._

_For use with `getStaticProps` the downside is that the new flags are only available once your site is redeployed. You will be able to automate redeployments on flag changes with Deploy Hooks on happykit.dev soon._

_Note that when you use `getFlags()` with `getStaticProps` the static generation phase has no concept of a visitor, so rollouts based on visitor information are not possible. You can still use `getStaticProps`, but you should also use `useFlags()` in such cases._

_For use with `getServerSideProps` the downside of not passing the flags through `useFlags()` is that flag changes are only shown when the page is reloaded._

### With disabled revalidation

HappyKit uses the browser's [`visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) event to revalidate feature flags when the active window regains visibility. If you explicitly set `revalidateOnFocus` to `false`, then HappyKit will no longer revalidate. This can be useful if you want to reduce the number of requests to HappyKit. 

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

export const getServerSideProps = (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const flagBag = useFlags({
    revalidateOnFocus: false,
    initialState: props.initialFlagState
  });

  return flagBag.flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```

## Examples

### Full example

This demo shows the full configuration with server-side rendering and code splitting.

The `@happykit/flags` client will resolve flags from the cache while it revalidates the flags in the background. This means that flags might flip from one value to another after the initial render in case the cache is outdated.

You can use a property called `settled` which turns `true` once the flags are freshly validated from the server. Using this property allows you to ensure flags are freshly loaded before kicking off a heavier task like loading a component.


```js
// flags.config.js
import { configure } from "@happykit/flags/config";

configure({ envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY });
```

```js
// pages/_app.js
import App from 'next/app';
import '../flags.config'

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

```js
// pages/profile.js
import * as React from 'react';
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('../components/profile-a'));
const ProfileVariantB = dynamic(() => import('../components/profile-b'));


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

  // The flags will always start as settled when you pass in initialState from
  // `getServerSideProps`. When you use `getStaticProps`, the flags will not
  // start as settled, since static rendering has no concept of a visitor.
  //
  // So the check for "settled" is unnecessary in this example, but useful if
  // you want to use `getStaticProps`.
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
// types/AppFlags.ts

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

```ts
// flags.config.ts

import { configure } from "@happykit/flags/config";
// import your custom AppFlags type
import { AppFlags } from "../types/AppFlags";


// the types defined in "configure" are used to check "defaultFlags"
configure<AppFlags>({
  envKey: 'flags_pub_272357356657967622',
  defaultFlags: {
    booleanFlag: true,
    numericFlag: 10,
    textualFlag: 'profileA',
  },
});
```

```ts
// pages/_app.tsx
import '../flags.config';
```

```ts
// pages/SomePage.tsx
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import { AppFlags } from "../types/AppFlags";

export async function getServerSideProps(context) {
  // Pass your AppFlags type when calling getFlags()
  const { flags, initialFlagState } = await getFlags<AppFlags>({ context });

  flags.booleanFlag; // has type "boolean"
  flags.numericFlag; // has type "number"
  flags.textualFlag; // has type "string"

  return { props: { initialFlagState } };
}

export default function SomePage(props) {
  // Pass your AppFlags type when calling useFlags()
  const { flags } = useFlags<AppFlags>({ initialState: props.flags });

  flags.booleanFlag; // has type "boolean"
  flags.numericFlag; // has type "number"
  flags.textualFlag; // has type "string"

  return <div>{JSON.stringify(flags, null, 2)}</div>;
}
```

### Code splitting

If you have two variants for a page and you only want to render one depending on a feature flag, you're able to keep the client-side bundle small by using dynamic imports.

```js
import * as React from 'react';
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
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

Notice that the loading state is gone with that as well, since the flags are available upon the first render.

```js
// with server-side flag preloading
import * as React from 'react';
import { useFlags, getFlags, Flags } from '@happykit/flags';
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('../components/profile-a'));
const ProfileVariantB = dynamic(() => import('../components/profile-b'));


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

You can use `getEdgeFlags` from `@happykit/flags/edge` to evaluate flags from the [Next.js Middleware](https://nextjs.org/docs/middleware).

Note that you will need to import your `flags.config`:

```ts
// _middleware.ts
import "../../../flags.config";
import { getEdgeFlags } from "@happykit/flags/edge";
```


One way to make your middleware less verbose is to create your own `edge-flags.ts` file which imports `flags.config` and exports `getEdgeFlags`. That way you only need to import `getEdgeFlags` in your middleware.

An example could look like this:
```ts
// edge-flags.ts
import "../../../flags.config";
export { getEdgeFlags } from "@happykit/flags/edge";
```

You would then `import { getEdgeFlags } from "../edge-flags.ts"` in your own code.



A fully configured middleware could look like this:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { AppFlags } from "../../../types/AppFlags";
import { getEdgeFlags } from "../edge-flags.ts";
// Or import these if you didn't create edge-flags.ts:
// import "../../../flags.config";
// import { getEdgeFlags } from "@happykit/flags/edge";


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

Notice that we need to `import "../../../flags.config"` so `getEdgeFlags` has access to the configuration.

Another new property of `getEdgeFlags` is `flagBag.cookie`. This is set whenver the flag response contains a visitor key. You must then manually set the cookie on the response so the visitor can be reidentified on the next page load.

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

There is a shortcut tho make this more concise:

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
