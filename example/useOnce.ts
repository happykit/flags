import { useEffect } from "react";

let usedTimes = 0;

export function useOnce() {
  useEffect(() => {
    usedTimes++;

    if (usedTimes > 1) console.log("USED TWICE");

    return () => {
      usedTimes--;
    };
  }, []);
}
