# @happykit/flags

## 3.3.0

### Minor Changes

- 79d13e9: allow disabling visitor key cookie

  You can now configure or disable the visitor key cookie `@happykit/flags` sets by default. You can pass a `serializeVisitorKeyCookie` function to the options when calling `createUseFlags` and `createGetFlags`.

## 3.2.0

### Minor Changes

- e473304: add Next.js [App Router](https://nextjs.org/blog/next-13-4#nextjs-app-router) support

  HappyKit has a feature called `visitorKey`, you can learn more about it [here](https://flags.happykit.dev/demo/targeting-by-visitor-key). If you want to use this feature with App Router you need to set the cookie from middleware using the `ensureVisitorKeyCookie` from `@happykit/flags/edge`. See the `example/middleware.ts` file in this repository for an example of how to do this. This is necessary as App Router pages can not set any cookies when they render, so we have to fall back to setting the cookie from middleware instead. If you do not need the `visitorKey` for your custom evaluation rules or rollouts then you do not need to set the cookie from middleware.

## 3.1.3

### Patch Changes

- 21a540c: add cache: no-store to all fetch requests

## 3.1.2

### Patch Changes

- c53e69a: ensure getEdgeFlags is compatible with Next.js 13.4

## 3.1.1

### Patch Changes

- d509435: Update the cookie logic to work with Next.js 13.

## 3.1.0

### Minor Changes

- b3c53da: Add custom storage capabilities

## 3.0.0

### Major Changes

- 1822587: BREAKING CHANGE: Configuration overhaul

  ### What

  This release changes HappyKit's configuration approach.

  Previously you had to create a `flags.config.js` file and import it into your `pages/_app.js` and into every middleware that wanted to use feature flags. If you were using your own `AppFlags` type, you also had to pass this type every time you invoked `getFlags()`, `useFlags()` or `getEdgeFlags()`. And the configuration options for client-, server- and edge were mixed together into a single `flags.config.js` file.

  ### Why

  This release replaces the existing configuration approach with a new one. This new approach configuration prepares happykit for upcoming features.

  ### How

  #### 1. Add `flags` folder

  Follow the updated [Setup](https://github.com/happykit/flags/tree/master/package#setup) instructions to create the `flags` folder in your own application, and fill it with.

  After this step, you should have

  - `./flags/config.ts` which exports a configuration
  - `./flags/client.ts` which exports a `useFlags` function
  - `./flags/server.ts` which exports a `getFlags` function
  - `./flags/edge.ts` which exports a `getEdgeFlags` function

  #### 2. Set up absolute imports

  Enable Absolute Imports as described [here](https://github.com/happykit/flags/tree/master/package#absolute-imports).

  #### 3. Adapt your imports

  Then change the application code in your `pages/` folder to use these functions from your `flags/` folder instead of from `@happykit/flags`:

  ```diff
  - import { useFlags } from "@happykit/flags/client"
  + import { useFlags } from "flags/client"
  ```

  ```diff
  - import { getFlags } from "@happykit/flags/server"
  + import { getFlags } from "flags/server"
  ```

  ```diff
  - import { getEdgeFlags } from "@happykit/flags/edge"
  + import { getEdgeFlags } from "flags/edge"
  ```

  _Note that because of the absolute imports we configured in step 2, all imports from `"flags/_"` will use the local flags folder you created in step 1.\*

  #### 4. Delete your old setup

  We can now delete the old setup since we no longer need it

  - delete `flags.config.js`
  - remove the `flags.config` import from your `pages/_app` file
    - you might be able to delete the `pages/_app` file if it's not doing anything else anymore
  - remove the import of `flags.config` from your middleware
