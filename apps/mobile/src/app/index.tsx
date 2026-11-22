import { Redirect } from "expo-router";
import { Loading } from "../components/Loading";
import { useSession } from "../session";

export default function IndexRoute() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
