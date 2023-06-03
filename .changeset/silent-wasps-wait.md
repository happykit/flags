---
"@happykit/flags": minor
---

add Next.js [App Router](https://nextjs.org/blog/next-13-4#nextjs-app-router) support

HappyKit has a feature called `visitorKey`, you can learn more about it [here](https://flags.happykit.dev/demo/targeting-by-visitor-key). If you want to use this feature with App Router you need to set the cookie from middleware using the `ensureVisitorKeyCookie` from `@happykit/flags/edge`. See the `example/middleware.ts` file in this repository for an example of how to do this. This is necessary as App Router pages can not set any cookies when they render, so we have to fall back to setting the cookie from middleware instead. If you do not need the `visitorKey` for your custom evaluation rules or rollouts then you do not need to set the cookie from middleware.
