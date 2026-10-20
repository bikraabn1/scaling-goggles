import { redirect } from "react-router";
import { getSession } from "~/lib/auth.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("authenticated") === true) {
    return redirect("/dashboard");
  }
  return redirect("/login");
}

export default function Home() {
  return null;
}
