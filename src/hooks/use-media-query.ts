
"use client";

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Ensure this code runs only on the client
    if (typeof window !== 'undefined') {
      const mediaQueryList = window.matchMedia(query);
      
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // Initial check
      setMatches(mediaQueryList.matches);
      
      // Add listener for changes
      mediaQueryList.addEventListener('change', listener);
      
      // Cleanup listener on component unmount
      return () => {
        mediaQueryList.removeEventListener('change', listener);
      };
    }
  }, [query]);

  return matches;
}
