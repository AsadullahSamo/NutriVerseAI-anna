import { QueryClient } from "@tanstack/react-query"

async function throwIfResNotOk(res) {
  if (!res.ok) {
    let message
    try {
      message = (await res.json()).message
    } catch {
      message = res.statusText
    }
    throw new Error(message || `${res.status}: Request failed`)
  }
}

export async function apiRequest(method, path, body, customHeaders) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders
    },
    body: body ? JSON.stringify(body) : undefined
  })
  await throwIfResNotOk(response)
  return response
}

export const getQueryFn = () => async ({ queryKey }) => {
  const res = await fetch(queryKey[0], { headers: { Accept: "application/json" } })
  await throwIfResNotOk(res)
  return await res.json()
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false
    },
    mutations: { retry: false }
  }
})
