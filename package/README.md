<a id="nav">
  <img src="https://i.imgur.com/MS2Gtkj.png" width="100%" />
</a>

<div align="right">
  <a href="https://github.com/happykit/flags/tree/master/package">Docs</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://flags.happykit.dev/">Examples</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://happykit.dev/solutions/flags">Website</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://twitter.com/happykitdev" target="_blank">Twitter</a>
</div>

&nbsp;
&nbsp;

Add Feature Flags to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Flags. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

**Key Features**

- written for Next.js
- integrate using a simple `useFlags()` hook
- only 1 kB in size
- extremely fast flag responses (~50ms)
- supports individual user targeting, custom rules and rollouts
- ssupports server-side rendering and static site generation

<details><br /><br />
  <summary><b>Want to see a demo?</b></summary>

  <img alt="HappyKit Flags Demo" src="https://user-images.githubusercontent.com/1765075/94278500-90819000-ff53-11ea-912a-a59cfb491406.gif" />
  <br /><br />
</details>

<br />

---

<br />

- [Installation](#installation)
- [Setup](#setup)
- [Basic Usage](#basic-usage)
- [API](#api)
  - [`configure`](#configure)
  - [`useFlags`](#useflags)
    - [`flagBag`](#flagbag)
    - [Supported user attributes](#supported-user-attributes)
  - [`getFlags`](#getflags)
- [Advanced Usage](#advanced-usage)
  - [With user targeting](#with-user-targeting)
  - [Configuring application-wide default values](#configuring-application-wide-default-values)
  - [With server-side rendering](#with-server-side-rendering)
  - [With static site generation](#with-static-site-generation)
  - [With static site generation only](#with-static-site-generation-only)
  - [With disabled revalidation](#with-disabled-revalidation)
- [Examples](#examples)
  - [Full example](#full-example)
  - [TypeScript example](#typescript-example)
    - [Default Types](#default-types)
    - [Custom Flag Type](#custom-flag-type)
  - [Code splitting](#code-splitting)

<br />

## Installation

```
npm install @happykit/flags
```

## Setup

Configure your application in `_app.js`.

```js
// _app.js
import { configure } from "@happykit/flags/config";

configure({ envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY });
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
  return flags.xzibit ? 'Yo dawg' : 'Hello';
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
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

## API

### `configure`

- `configure(options)`
  - `options.envKey` _(string)_ _required_: Your HappyKit Flags Client Id
  - `options.defaultFlags` _(object)_ _optional_: Key-value pairs of flags and their values. These values are used as fallbacks in `useFlags` and `getFlags`. The fallbacks are used while the actual flags are loaded, in case a flag is missing or when the request loading the flags fails for unexpected reasons. If you don't declare `defaultFlags`, then the flag values will be `undefined`.
  - `options.disableCache` _(boolean)_ _optional_: Pass `true` to turn off the client-side cache. The cache is persisted to `localStorage` and persists across page loads. Even with an enabled cache, all flags will get revalidated in [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861) fashion.

### `useFlags`

- `useFlag(options)`
  - `options.user` _(object)_ _optional_: A user to load the flags for. A user must at least have a `key`. See the supported user attributes [here](#supported-user-attributes). The user information you pass can be used for [individual targeting](#with-user-targeting) or rules. You can set the `persist` attribute on the user to store them in HappyKit for future reference.
  - `options.traits` _(object)_ _optional_: An object which you have access to in the flag's rules. You can target users based on traits.
  - `options.initialState` _(object)_ _optional_: In case you preloaded your flags during server-side rendering using `getFlags()`, provide the returned state as `initialState`. The client will then skip the first request whenever possible and use the provided flags instead. This allows you to get rid of loading states and on the client.
  - `options.revalidateOnFocus` _(object)_ _optional_: By default the client will revalidate all feature flags when the browser window regains focus. Pass `revalidateOnFocus: false` to skip this behaviour.
  - `options.disableCache` _(boolean)_ _optional_: The client will not cache the flags in localStorage when this setting is enabled.

This function returns an object we usually call [`flagBag`](#flagBag). It contains the requested flags and other information.

#### `flagBag`

This object is returned from `useFlags()`.

- `flags` _(object)_: The loaded feature flags, with the defaults applied.
- `visitorKey` _(string | null)_: The visitor key the feature flags were fetched for.
- `settled` _(boolean)_: Unless you are providing `initialState`, the client will need to fetch the feature flags from the API. In some cases, during static site generation, it will even need to fetch the feature flags from the API even though you provided `initialState`. The `settled` value will turn `true` once the flags have settled on the client. This means that the only way for the value of the flags to change from then on would be if you changed one of the feature flags, or provided different inputs (`user`, `traits`). Once `settled` has turned true, it will not turn back to false. You can use `settled` in case you want to wait for the "final" feature flag values before kicking of code splitting (or showing UI).
- `fetching` _(boolean)_: This is `true` whenever the client is loading feature flags. This might happen initially, on rerenders with changed inputs (`user`, `traits`) or when the window regains focus and revaldiation is triggered. You probably want to use `settled` instead, as `settled` stays truthy once the flags were loaded, while `fetching` can flip multiple times.

#### Supported user attributes

Provide any of these attributes to store them in HappyKit. You will be able to use them for targeting specific users based on rules later on (_not yet available in HappyKit Flags_).

- `key` _(string)_ _required_: Unique key for this user
- `email` _(string)_: Email-Address
- `name` _(string)_: Full name or nickname
- `avatar` _(string)_: URL to users profile picture
- `country` _(string)_: Two-letter uppercase country-code of user's county, see [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1)
- `persist` _(boolean)_: This is a special attribute which tells HappyKit to persist that user in HappyKit. When you persist a user, you can see that users profile on [happykit.dev](https://happykit.dev/). *Note that persisting users will incur additional charges in the future.*

### `getFlags`

- `getFlags(options)`
  - `options.context` _(object)_ _required_: The context which you receive from `getStaticProps` or `getServerSideProps`.
  - `options.user` _(object)_ _optional_: Same as `user` in `useFlags()`. If pass a user here, make sure to pass the same user to `useFlags({ user })`.
  - `options.traits` _(object)_ _optional_: Same as `traits` in `useFlags()`. If pass traits here, make sure to pass the same traits to `useFlags({ traits })`.

This function returns a promise resolving to an object that looks like this:

```js
{
  flags: { /* Evaluated flags, combined with the configured fallbacks */ },
  loadedFlags: { /* Evaluated flags, as loaded from the API (no fallbacks applied) */ },
  initialFlagState: { /* Information about the loaded flags, which can be provided to useFlags({ initialState }) */ }
```

## Advanced Usage

### With user targeting

You can provide a `user` as the first argument. Use this to enable per-user targeting of your flags. A `user` must at least have a `key` property.

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";

export default function FooPage(props) {
  const flagBag = useFlags({ user: { key: 'user-id' } });
  return flagBag.flags.xzibit ? 'Yo dawg' : 'Hello';
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

  return flagBag.flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

</details>

[See all supported user attributes](#supported-user-attributes)

<br />

### Configuring application-wide default values

You can configure application-wide default values for flags. These defaults will be used while your flags are being loaded (unless you're using server-side rendering). They'll also be used as fallback values in case the flags couldn't be loaded from HappyKit.

```js
// _app.js
import { configure } from "@happykit/flags/config";

configure({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY,
  defaultFlags: { xzibit: true },
});
```

### With server-side rendering

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
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With static site generation

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
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With static site generation only

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

_For use with `getServerSideProps` the downside is that flag changes are only shown when the page is reloaded._

### With disabled revalidation

HappyKit uses the browser's [`visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) event to revalidate feature flags when the active window regains visibility. If you explicitly set `revalidateOnFocus` to `false`, then HappyKit will no longer revalidate. This can be useful if you want to reduce the number of requests to HappyKit. 

```js
// pages/foo.js
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

export const getStaticProps = (context) => {
  const { initialFlagState } = await getFlags({ context });
  return { props: { initialFlagState } };
};

export default function FooPage(props) {
  const flagBag = useFlags({
    revalidateOnFocus: false,
    initialState: props.initialFlagState
  });

  return flagBag.flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

## Examples

### Full example

This demo shows the full configuration with server-side rendering and code splitting.

```js
// _app.js
import App from 'next/app';
import { configure } from "@happykit/flags/config";

configure({ envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY });

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

  return flagBag.flags.profileVariant === 'A' ? (
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
// _app.tsx
import { configure } from "@happykit/flags/config";
// import your custom AppFlags type
import { AppFlags } from "../types/AppFlags";


// the types defined in "configure" are used to check "defaultFlags"
configure<AppFlags>({
  endpoint: 'http://localhost:8787/api/flags',
  envKey: 'flags_pub_272357356657967622',
  defaultFlags: {
    booleanFlag: true,
    numericFlag: 10,
    textualFlag: 'profileA',
  },
});
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

  return flagBag.flags.profileVariant === 'A' ? (
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

  return flagBag.flags.profileVariant === 'A' ? (
    <ProfileVariantA user={props.user} />
  ) : (
    <ProfileVariantB user={props.user} />
  );
}
```

*This technique of removing the loading state works only with `getServerSideProps`. If you use `getStaticProps`, the server has no concept of the current visitor, but a visitor could influence flag rollouts. The client thus needs to reevaluate the flags and will only settle (pass `settled: true`) once the client-side reevaluation has completed.*
