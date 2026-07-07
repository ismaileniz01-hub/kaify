import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminHubGate } from "@/components/admin/AdminHubGate";
import { resolveIsHubAdmin } from "@/lib/auth/admin-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isHubAdmin = await resolveIsHubAdmin(user.id);
  if (!isHubAdmin) {
    redirect("/welcome");
  }

  return <AdminHubGate>{children}</AdminHubGate>;
}
