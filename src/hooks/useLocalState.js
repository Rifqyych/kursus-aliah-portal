import { useEffect, useState } from "react";

export function useLocalState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const savedValue = window.localStorage.getItem(key);

    if (!savedValue) {
      return initialValue;
    }

    try {
      return JSON.parse(savedValue);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
