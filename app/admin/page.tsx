import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminDashboard adminUsername={session.username} role={session.role} />;
}
