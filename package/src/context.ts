import * as React from "react";
import { FlagBag, Flags } from "./internal/types";

/**
 * Allows you to access the flags from context
 */
const FlagBagContext = React.createContext<FlagBag<Flags> | null>(null);

/**
 * This function accesses the `flagBag` from the context. You have to put it there
 * first by rendering a `<FlagBagProvider value={flagBag} />`.
 *
 * _Note that it's generally better to explicitly pass your flags down as props,
 * so you might not need this at all._
 */
export function createUseFlagBag<F extends Flags = Flags>() {
  /**
   * Accesses the evaluated flags from context.
   *
   * You need to render a <FlagBagProvider /> further up to be able to use
   * this component.
   */
  return function useFlagBag() {
    const flagBagContext = React.useContext(FlagBagContext);
    if (flagBagContext === null)
      throw new Error("Error: useFlagBag was used outside of FlagBagProvider.");
    return flagBagContext as FlagBag<F>;
  };
}

/**
 * If you want to be able to access the flags from context using `useFlagBag()`,
 * you can render the FlagBagProvider at the top of your Next.js pages, like so:
 *
 * ```js
 * import { useFlags } from "@happykit/flags/client"
 * import { FlagBagProvider, useFlagBag } from "@happykit/flags/context"
 *
 * export default function YourPage () {
 *   const flagBag = useFlags()
 *
 *   return (
 *     <FlagBagProvider value={flagBag}>
 *       <YourOwnComponent />
 *     </FlagBagProvider>
 *   )
 * }
 * ```
 *
 * You can then call `useFlagBag()` to access your `flagBag` from within
 * `YourOwnComponent` or further down.
 *
 * _Note that it's generally better to explicitly pass your flags down as props,
 * so you might not need this at all._
 */
export function FlagBagProvider<F extends Flags>(props: {
  value: FlagBag<F>;
  children: React.ReactNode;
}) {
  return React.createElement(
    FlagBagContext.Provider,
    { value: props.value },
    props.children
  );
}
