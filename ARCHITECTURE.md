# Architecture

We are using [`preconstruct`](https://preconstruct.tools/) so you don't need to start any compilation.

This project uses two yarn workspaces: `package` and `example`.

## `package`

The `@happykit/flags` library lives inside `package`.

## `example`

A Next.js example project lives inside `example`. The Next.js example project uses `@preconstruct/next`, which is only necessary for development of `@happykit/flags` but not required in a real Next.js project.

