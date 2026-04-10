import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,     // Automatically refresh data when doctor switches tabs back to the app
      retry: 1,                       // Retry failed queries once
      refetchOnMount: false           // Avoid unnecessary double fetches if already cached and fresh
    },
  },
});
