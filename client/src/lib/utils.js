import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import config from "./config";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export async function apiRequest(method, path, body) {
  const fullUrl = path.startsWith('http') ? path : `${config.apiBaseUrl}${path}`;
  const response = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      // Try to parse error message from server response
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If parsing fails, use statusText
      console.warn('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}
