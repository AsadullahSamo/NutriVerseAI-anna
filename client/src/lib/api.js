// All "/api/..." calls are answered in the browser by src/anna/fetch-shim.js.
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...options.headers }
  })
  if (!response.ok) {
    let message
    try {
      message = (await response.json()).message
    } catch {
      message = response.statusText
    }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

export { apiFetch }
export const api = {
  get: (url, o = {}) => apiFetch(url, { ...o, method: "GET" }),
  post: (url, d, o = {}) => apiFetch(url, { ...o, method: "POST", body: JSON.stringify(d) }),
  put: (url, d, o = {}) => apiFetch(url, { ...o, method: "PUT", body: JSON.stringify(d) }),
  delete: (url, o = {}) => apiFetch(url, { ...o, method: "DELETE" }),
  patch: (url, d, o = {}) => apiFetch(url, { ...o, method: "PATCH", body: JSON.stringify(d) })
}
