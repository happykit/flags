<a id="nav">
  <img src="https://i.imgur.com/MS2Gtkj.png" width="100%" />
</a>

<div align="right">
  <a href="https://github.com/happykit/flags/tree/master/package">Documentation</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://flags.happykit.dev/" target="_blank">Examples</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://medium.com/frontend-digest/using-feature-flags-in-next-js-c5c8d0795a2?source=friends_link&sk=d846a29f376acf9cfa41e926883923ab" target="_blank">Full Tutorial</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://happykit.dev/solutions/flags" target="_blank">happykit.dev</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://twitter.**com**/happykitdev" target="_blank">@happykitdev</a>
</div>

<br />

&nbsp;

Add Feature Flags to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Flags. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

## Key Features

- written for Next.js
- integrate using a simple `useFlags()` hook
- only 5 kB in size
- extremely fast flag responses (~50ms)
- supports *user targeting*, *custom rules* and *rollouts*
- supports *server-side rendering* and *static site generation*
- supports *_middleware (edge functions)*
  
<br />

<details>
  <summary><b>Want to see a demo?</b></summary>

  <img alt="HappyKit Flags Demo" src="https://user-images.githubusercontent.com/1765075/94278500-90819000-ff53-11ea-912a-a59cfb491406.gif" />
  <br /><br />
</details>

<br />

## Documentation

See the [full documentation](https://github.com/happykit/flags/tree/master/package) for setup instructions and usage guides.

## Examples

This is roughly what the usage of feature flags looks like once you're up and running.

```js
// pages/index.js
import { useFlags } from "@happykit/flags/client";

export default function IndexPage(props) {
  const { flags } = useFlags();
  return flags?.xzibit ? 'Yo dawg' : 'Hello';
}
```


The self documenting examples at [flags.happykit.dev](https://flags.happykit.dev/) show how to use `@happykit/flags` for client-side, static and server-side rendering. 


## Full Tutorial

A full tutorial including setup instructions is published on [frontend-digest.com](https://medium.com/frontend-digest/using-feature-flags-in-next-js-c5c8d0795a2?source=friends_link&sk=d846a29f376acf9cfa41e926883923ab).


<br />

---

<br />

> *Are you looking for the old docs? They are available under [under the v0.3.0 tag](https://github.com/happykit/flags/tree/v0.3.0).*
