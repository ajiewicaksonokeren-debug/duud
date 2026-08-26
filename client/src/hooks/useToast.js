import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info', duration = 2200) => {
    clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, showToast };
}
