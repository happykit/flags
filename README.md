<a id="nav">
  <img src="https://i.imgur.com/MS2Gtkj.png" width="100%" />
</a>

<div align="right">
  <a href="https://happykit.dev/">Website</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://twitter.com/happykitdev" target="_blank">Twitter</a>
</div>

&nbsp;
&nbsp;

Add Feature Flags to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Flags. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

- [Key Features](#key-features)
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
  - [Code splitting](#code-splitting)

## Key Features

- written for Next.js
- integrate using a simple `useFlags` hook
- only 1 kB in size
- extremely fast flag responses (under 100ms on average)
- target individual users
- server-side rendering support
- static site generation support (redeploy your website on flag changes)

## Installation

```
npm install @happykit/flags
```

## Setup

Configure your application in `_app.js`.

```js
// _app.js
import { configure } from '@happykit/flags';

configure({ clientId: process.env.NEXT_PUBLIC_FLAGS_CLIENT_ID });
```

If you don't have a custom `_app.js` yet, see the [Custom `App`](https://nextjs.org/docs/advanced-features/custom-app) section of the Next.js docs for setup instructions.

Create an account on [`happykit.dev`](https://happykit.dev/signup) to receive your `clientId`. You'll find it in the **Keys** section of your project settings once you created a project.

Make sure the environment variable containing the `clientId` starts with `NEXT_PUBLIC_` so the value is available on the client side.

Store your `clientId` in `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_FLAGS_CLIENT_ID=flags_pub_development_xxxxxxxxxx
```

Later on, don't forget to also provide the environment variable in production.

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
  - `options.clientId` _(string)_ _optional_: Your HappyKit Flags Client Id
  - `options.defaultFlags` _(object)_: Key-value pairs of flags and their values. These values are used as fallbacks in `useFlags` and `getFlags`. The fallbacks are used while the actual flags are loaded, in case a flag is missing or when the request loading the flags fails for unexpected reasons. If you don't declare `defaultFlags`, then the flag values will be `undefined`.

### `useFlags`

- `useFlag(options)`
  - `options.user` _(object)_ _optional_: A user to load the flags for. The user you pass here will be stored in HappyKit for future reference. A user must at least have a `key`. See a list of supported user attributes below.
  - `options.initialFlags` _(object)_ _optional_: In case you preloaded user flags during server-side rendering or static site generation, provide the flags as `initialFlags`. The client will then skip the initial request and use the provided flags instead. This allows you to get rid of loading states on the client.
  - `options.revalidateOnFocus` _(object)_ _optional_: By default, the client will revalidate all feature flags when the browser window regains focus. Pass `revalidateOnFocus: false` to skip this behaviour.

This function returns an object containing the requested flags.

#### Supported user attributes

Provide any of these attributes to store them in HappyKit. You will be able to use them for targeting specific users based on rules later on (_not yet available in HappyKit Flags_).

- `key` _(string)_: Unique key for this user
- `email` _(string)_: Email-Address
- `name` _(string)_: Full name or nickname
- `avatar` _(string)_: URL to users profile picture
- `country` _(string)_: Two-letter uppercase country-code of user's county, see [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1)

### `getFlags`

- `useFlag(user)`
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
  clientId: process.env.NEXT_PUBLIC_FLAGS_CLIENT_ID,
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

_Note that you lose some features like revalidation when you go for this plain approach. This also means visitor will only see the changes once your site is redeployed instead of right away._

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

configure({ clientId: process.env.NEXT_PUBLIC_FLAGS_CLIENT_ID });

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
  if (!flags.profileVariant) return null;

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
