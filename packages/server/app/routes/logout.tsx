import { type ActionFunctionArgs } from "react-router";
import { logout } from "~/lib/auth";

export async function action({ request, context }: ActionFunctionArgs) {
  return await logout(request, context.cloudflare.env);
}

export async function loader({ request, context }: ActionFunctionArgs) {
  return await logout(request, context.cloudflare.env);
}