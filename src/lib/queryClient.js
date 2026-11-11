import { QueryClient, MutationCache } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  // Any successful write may change what an Overview shows (follow-ups, cases,
  // approvals, receipts...), so every successful mutation refreshes Overview
  // data. Overview queries are all keyed ['overview', ...].
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
