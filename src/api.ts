import { createApiClient, json } from "@rello/shared/api";
export type { Comment, Notification, Post, User } from "@rello/shared/types";

const TOKEN_KEY = "rello.session";
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const client = createApiClient(apiBaseUrl, {
  get: getToken,
  set: setToken,
  clear: clearToken
});

export const api = client.request;
export const assetUrl = (path?: string) => {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
};
export { json };
