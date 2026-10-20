import { destroyUserSession } from "~/lib/auth.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  return destroyUserSession(request);
}

export async function loader({ request }: Route.LoaderArgs) {
  return destroyUserSession(request);
}
