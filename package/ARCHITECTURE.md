# Architecture

We are using turborepo so you don't need to start any compilation.

This project uses two pnpm workspaces: `package` and `example`.

## `package`

The `@happykit/flags` library lives inside `package`.

## `example`

A Next.js example project lives inside `example`. The Next.js example project uses turborepo to load in `@happykit/flags` via the workspace.

# Publishing

## Publishing for the `next` dist-tag

To publish a `next` version from the `package` folder run `pnpm test && pnpm build` and then `pnpm publish --tag next`.

This will ask you for the next version, automatically change it in `package.json` and commit it.

Don't forget to `git push` after publishing!

Here are the commands in a simple order:

```bash
git checkout next # ensure you are on "next"
git status # ensure you can push and are up to date

cd package
pnpm test
pnpm build
pnpm publish --tag next
git push --follow-tags
```

## Moving the `latest` dist-tag

Run this command to release a published version under the `latest` dist-tag:

```
npm dist-tag add @happykit/flags@<version> latest
```
