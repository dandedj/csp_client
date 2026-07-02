import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly changing value.
 *
 * @param {*} value - The value to debounce.
 * @param {number} delay - Delay in milliseconds before the value settles.
 * @returns {*} The most recent value once it has stopped changing for `delay` ms.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
