import { useEffect } from 'react';

/** Sets document.title for the current route (helps screen readers and history). */
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Spelling Tutor` : 'Spelling Tutor';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
