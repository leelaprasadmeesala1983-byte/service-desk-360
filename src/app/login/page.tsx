import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentUser } from "@/lib/session";

import { LoginView } from "./login-view";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "TECHNICIAN" ? "/service-tickets" : "/");
  }

  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
