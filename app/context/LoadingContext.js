'use client';

import { createContext, useContext, useState } from 'react';
import Loader from '../components/Loader';

const LoadingContext = createContext({
  isLoading: false,
  showLoader: () => {},
  hideLoader: () => {},
});

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {isLoading && <Loader />}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);