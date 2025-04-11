import { useEffect, useRef } from "react";

export const useDidUpdate = (callback, deps) => {
  const hasMount = useRef(false);
  useEffect(() => {
    if (hasMount.current) {
      callback();
    } else {
      hasMount.current = true;
    }
  }, deps);
};
