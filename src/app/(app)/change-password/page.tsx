import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  await requireUser();
  redirect("/?modal=change-password");
}
