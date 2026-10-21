import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiPost } from './api';
import type { Parsed } from './songs';

/** The value, but only once it has stopped changing for `ms`, so typing does not call the API per keystroke. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** The Song as it will be saved from this text, parsed by the API (the one place that knows the format). */
export function useSheetPreview(text: string) {
  const settled = useDebounced(text);
  return useQuery({
    queryKey: ['preview', settled],
    queryFn: () => apiPost<Parsed>('/songs/parse', { text: settled }),
    enabled: settled.trim() !== '',
    placeholderData: keepPreviousData,
    retry: false,
  });
}
