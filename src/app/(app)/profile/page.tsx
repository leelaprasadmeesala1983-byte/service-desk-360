import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  await requireUser();
  redirect("/?modal=profile");
}
