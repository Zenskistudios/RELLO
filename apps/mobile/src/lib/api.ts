import { createApiClient } from "@rello/shared/api";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const defaultApiUrl = Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || defaultApiUrl;

const client = createApiClient(apiUrl, {
  get: () => SecureStore.getItemAsync("rello.session"),
  set: (token) => SecureStore.setItemAsync("rello.session", token),
  clear: () => SecureStore.deleteItemAsync("rello.session")
});

export const api = client.request;
export const mediaUrl = (path: string) => new URL(path, apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`).toString();
export { json } from "@rello/shared/api";
export type { Comment, Notification, Post, User } from "@rello/shared/types";

export async function saveToken(token: string) {
  await SecureStore.setItemAsync("rello.session", token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync("rello.session");
}
