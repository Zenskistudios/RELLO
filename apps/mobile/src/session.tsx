import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearToken, saveToken, type User } from "./lib/api";

type Credentials = { email: string; password: string; username?: string; displayName?: string };
type SessionValue = {
  user: User | null;
  loading: boolean;
  authenticate: (credentials: Credentials, register: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<User>("/api/auth/me")
      .then((currentUser) => { if (active) setUser(currentUser); })
      .catch(() => clearToken())
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function authenticate(credentials: Credentials, register: boolean) {
    const result = await api<{ token: string; user: User }>(`/api/auth/${register ? "register" : "login"}`, {
      method: "POST",
      body: JSON.stringify(credentials)
    });
    await saveToken(result.token);
    setUser(result.user);
  }

  async function signOut() {
    await clearToken();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, authenticate, signOut, updateUser: setUser }), [user, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider.");
  return value;
}
