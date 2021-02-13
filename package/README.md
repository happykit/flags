<a id="nav">
  <img src="https://i.imgur.com/MS2Gtkj.png" width="100%" />
</a>

<div align="right">
  <a href="https://happykit.dev/solutions/flags">Website</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://medium.com/frontend-digest/using-feature-flags-in-next-js-c5c8d0795a2?source=friends_link&sk=d846a29f376acf9cfa41e926883923ab">Full Tutorial</a>
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
- supports individual user targeting, custom rules and partial rollouts
- server-side rendering support
- static site generation support (redeploy your website on flag changes) *(soon)*

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
    - [Supported user attributes](#supported-user-attributes)
  - [`getFlags`](#getflags)
- [Advanced Usage](#advanced-usage)
  - [With user targeting](#with-user-targeting)
  - [Configuring application-wide default values](#configuring-application-wide-default-values)
  - [With initial flag values](#with-initial-flag-values)
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
import { configure } from '@happykit/flags';

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
import { useFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags();
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

Or with server-side rendering

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({ initialFlags: props.initialFlags });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}

export const getServerSideProps = async () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};
```

## API

### `configure`

- `configure(options)`
  - `options.envKey` _(string)_ _required_: Your HappyKit Flags Client Id
  - `options.defaultFlags` _(object)_ _optional_: Key-value pairs of flags and their values. These values are used as fallbacks in `useFlags` and `getFlags`. The fallbacks are used while the actual flags are loaded, in case a flag is missing or when the request loading the flags fails for unexpected reasons. If you don't declare `defaultFlags`, then the flag values will be `undefined`.
  - `options.disableCache` _(boolean)_ _optional_: Pass `true` to turn off the client-side cache. The cache is persisted to `localStorage` and persists across page loads. Even with an enabled cache, all flags will get revalidated in [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861) fashion.

### `useFlags`

- `useFlag(options)`
  - `options.user` _(object)_ _optional_: A user to load the flags for. The user you pass here will be stored in HappyKit for future reference and [individual targeting](#with-user-targeting). A user must at least have a `key`. See the supported user attributes [here](#supported-user-attributes).
  - `options.initialFlags` _(object)_ _optional_: In case you preloaded your flags during server-side rendering using `getFlags()`, provide the flags as `initialFlags`. The client will then skip the initial request and use the provided flags instead. This allows you to get rid of loading states on the client.
  - `options.revalidateOnFocus` _(object)_ _optional_: By default, the client will revalidate all feature flags when the browser window regains focus. Pass `revalidateOnFocus: false` to skip this behaviour.

This function returns an object containing the requested flags.

#### Supported user attributes

Provide any of these attributes to store them in HappyKit. You will be able to use them for targeting specific users based on rules later on (_not yet available in HappyKit Flags_).

- `key` _(string)_ _required_: Unique key for this user
- `email` _(string)_: Email-Address
- `name` _(string)_: Full name or nickname
- `avatar` _(string)_: URL to users profile picture
- `country` _(string)_: Two-letter uppercase country-code of user's county, see [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1)

### `getFlags`

- `getFlags(user)`
  - `user` _(object)_ _optional_: A user to load the flags for. The user you pass here will be stored in HappyKit for future reference. A user must at least have a `key`. See a list of supported user attributes [here](#supported-user-attributes).

This function returns a promise resolving to an object containing requested flags.

## Advanced Usage

### With user targeting

You can provide a `user` as the first argument. Use this to enable per-user targeting of your flags. A `user` must at least have a `key` property.

```js
// pages/foo.js
import { useFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({ user: { key: 'user-id' } });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

<details>
<summary>See here if you're using server-side rendering</summary>

Or if you're using [prerendering](#with-server-side-rendering)

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({
    user: props.user,
    initialFlags: props.initialFlags,
  });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}

export const getServerSideProps = async () => {
  const user = { key: 'user-id' };
  const initialFlags = await getFlags(user);
  return { props: { user, initialFlags } };
};
```

</details>

[See all supported user attributes](#supported-user-attributes)

<br />

### Configuring application-wide default values

You can configure application-wide default values for flags. These defaults will be used while your flags are being loaded (unless you're using server-side rendering). They'll also be used as fallback values in case the flags couldn't be loaded from HappyKit.

```js
// _app.js
import { configure } from '@happykit/flags';

configure({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY,
  defaultFlags: { xzibit: true },
});
```

### With initial flag values

Being able to set initial flag values is the first step towards server-side rendering. When you pass in `initialFlags` the flags will be set from the beginning. This is avoids the first request on the client.

```js
// pages/foo.js
import { useFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({ initialFlags: { xzibit: true } });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

### With server-side rendering

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({ initialFlags: props.initialFlags });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}

export const getServerSideProps = async () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};
```

### With static site generation

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({ initialFlags: props.initialFlags });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}

export const getStaticProps = () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};
```

### With static site generation only

You don't even need to use `useFlags` in case you're regenerating your site on flag changes anyways.

HappyKit can trigger redeployment of your site when you change your flags by calling a [Deploy Hook](https://vercel.com/docs/more/deploy-hooks) you specify.

```js
// pages/foo.js
import { getFlags } from '@happykit/flags';

export default function FooPage(props) {
  return props.flags.xzibit ? 'Yo dawg' : 'Hello';
}

export const getStaticProps = () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};
```

_The upside of this approach is that `useFlags` isn't even shipped to the client._

_For use with `getStaticProps` the downside is that the new flags are only available once your site is redeployed. You can automate redeployments on flag changes with Deploy Hooks.._

_For use with `getServerSideProps` the downside is that flag changes are only shown when the page is reloaded. You also lose client-side bootstrapping of feature flags, which uses cached flags while requesting the new flags in the background in a stale-while-revaldiate fashion._

### With disabled revalidation

- `revalidateOnFocus = true`: auto revalidate when window gets focused

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags({ revalidateOnFocus: false });
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}

export const getStaticProps = () => {
  const initialFlags = await getFlags();
  return { props: { initialFlags } };
};
```

## Examples

### Full example

This example shows the full configuration with server-side rendering and code splitting.

```js
// _app.js
import App from 'next/app';
import { configure } from '@happykit/flags';

configure({ envKey: process.env.NEXT_PUBLIC_FLAGS_ENVIRONMENT_KEY });

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

```js
// pages/profile.js
import * as React from 'react';
import { useFlags, getFlags, Flags } from '@happykit/flags';
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('../components/profile-a'));
const ProfileVariantB = dynamic(() => import('../components/profile-b'));

export default function Page(props) {
  const flags = useFlags({
    user: props.user,
    initialFlags: props.initialFlags,
  });

  return flags.profileVariant === 'A' ? (
    <ProfileVariantA user={props.user} />
  ) : (
    <ProfileVariantB user={props.user} />
  );
}

export const getServerSideProps = async ({ req, res }) => {
  // preload your user somehow
  const user = await getUser(req);
  // pass the user to getFlags to preload flags for that user
  const initialFlags = await getFlags(user);

  return { props: { user, initialFlags } };
};
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
// _app.tsx
import { configure } from '@happykit/flags';

type Flags = {
  booleanFlag: boolean;
  numericFlag: number;
  textualFlag: string;
  // You can lock textual and numeric flag values down even more, since
  // you know all possible values:
  // numericFlag: 0 | 10;
  // textualFlag: 'profileA' | 'profileB';
};

// the types defined in "configure" are used to check "defaultFlags"
configure<Flags>({
  endpoint: 'http://localhost:8787/',
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
import { useFlags, getFlags } from '@happykit/flags';

type Flags = {
  booleanFlag: boolean;
  numericFlag: number;
  textualFlag: string;
};

export default function SomePage(props) {
  const flags = useFlags<Flags>({ initialFlags: props.flags });
  flags.booleanFlag; // has type "boolean"
  flags.numericFlag; // has type "number"
  flags.textualFlag; // has type "string"
  return <div>{JSON.stringify(flags, null, 2)}</div>;
}

export async function getServerSideProps() {
  const initialFlags = await getFlags<Flags>();

  initialFlags.booleanFlag; // has type "boolean"
  initialFlags.numericFlag; // has type "number"
  initialFlags.textualFlag; // has type "string"

  return { props: { initialFlags } };
}
```

### Code splitting

If you have two variants for a page and you only want to render one depending on a feature flag, you're able to keep the client-side bundle small by using dynamic imports.

```js
import * as React from 'react';
import { useFlags, getFlags } from '@happykit/flags';
import dynamic from 'next/dynamic';

const ProfileVariantA = dynamic(() => import('../components/profile-a'));
const ProfileVariantB = dynamic(() => import('../components/profile-b'));

export default function Page(props) {
  const flags = useFlags({ user: { key: 'user_id_1' } });

  // display nothing while we're loading
  if (flags.profileVariant === undefined) return null;

  return flags.profileVariant === 'A' ? (
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

export default function Page(props) {
  const flags = useFlags({
    user: props.user,
    initialFlags: props.initialFlags,
  });

  return flags.profileVariant === 'A' ? (
    <ProfileVariantA user={props.user} />
  ) : (
    <ProfileVariantB user={props.user} />
  );
}

export const getServerSideProps = async ({ req, res }) => {
  // preload your user somehow
  const user = await getUser(req);
  // pass the user to getFlags to preload flags for that user
  const initialFlags = await getFlags(user);

  return { props: { user, initialFlags } };
};
```
