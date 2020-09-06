## `@happykit/flags`

Feature Flags for Next.js by [happykit.dev](https://happykit.dev/)

- [`@happykit/flags`](#happykitflags)
- [Features](#features)
- [Installation](#installation)
- [Setup](#setup)
- [Basic Usage](#basic-usage)
- [Advanced Usage](#advanced-usage)
  - [With user targeting](#with-user-targeting)
  - [Configuring application-wide default values](#configuring-application-wide-default-values)
  - [With initial flag values](#with-initial-flag-values)
  - [With server-side rendering](#with-server-side-rendering)
  - [With static site generation](#with-static-site-generation)
  - [With static site generation only](#with-static-site-generation-only)
  - [With disabled revalidation](#with-disabled-revalidation)
- [Examples](#examples)
  - [Code splitting](#code-splitting)

## Features

- written for Next.js
- integrate using a simple `useFlags` hook
- only 1 kB in size
- server-side rendering support
- extremely fast flag responses (under 100ms on average)
- target individual users
- optional static site generation support: redeploy your website on flag changes

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

Register on [`happykit.dev`](https://happykit.dev/signup) to receive your `clientId`. You'll find it in the **Keys** section of your project settings once you created a project.

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
import { useFlags, getFlags } from '@happykit/flags';

export default function FooPage(props) {
  const flags = useFlags();
  return flags.xzibit ? 'Yo dawg' : 'Hello';
}
```

## Advanced Usage

### With user targeting

You can provide a `user` as the first argument. Use this to enable per-user targeting of your flags. A `user` must at least have a `key` property.

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

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

export const getServerSideProps = () => {
  const user = { key: 'user-id' };
  const initialFlags = getFlags(user);
  return { props: { user, initialFlags } };
};
```

</details>

<details>

<summary>See all supported user attributes</summary>

Provide any of these attributes to store them in HappyKit. You will be able to use them for targeting specific users based on rules later on.

- `key` _(string)_: Unique key for this user
- `email` _(string)_: Email-Address
- `name` _(string)_: Full name or nickname
- `avatar` _(string)_: URL to users profile picture
- `country` _(string)_: Two-letter uppercase country-code of user's county, see [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1)

</details>

<br />

### Configuring application-wide default values

You can configure application-wide default values for flags. These defaults will be used while your flags are being loaded (unless you're using server-side rendering). They'll also be used as fallback values in case the flags couldn't be loaded from HappyKit.

```js
// _app.js
import { configure } from '@happykit/flags';

configure({
  clientId: process.env.NEXT_PUBLIC_FLAGS_CLIENT_ID,
  defaultValues: { xzibit: true },
});
```

### With initial flag values

Being able to set initial flag values is the first step towards server-side rendering. When you pass in `initialFlags` the flags will be set from the beginning. This is avoids the first request on the client.

```js
// pages/foo.js
import { useFlags, getFlags } from '@happykit/flags';

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

export const getServerSideProps = () => {
  const initialFlags = getFlags();
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
  const initialFlags = getFlags();
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
  const initialFlags = getFlags();
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
  const initialFlags = getFlags();
  return { props: { initialFlags } };
};
```

## Examples

### Code splitting

If you have two variants for a page and you only want to render one depending on a feature flag, you're able to keep the client-side bundle small by using dynamic imports.

```js
// TODO
```

You can even go a step further and preload the flags on the server, so that the client receives a prerenderd page.

```js
// TODO
```
