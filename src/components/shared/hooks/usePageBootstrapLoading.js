import { useEffect, useState } from 'react';

const usePageBootstrapLoading = ({ enabled = true, minDuration = 240 } = {}) => {
  const [isLoading, setIsLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, Math.max(0, Number(minDuration) || 0));

    return () => window.clearTimeout(timer);
  }, [enabled, minDuration]);

  return isLoading;
};

export default usePageBootstrapLoading;
