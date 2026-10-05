import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getApplication } from "@/lib/server/application";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const request = new Request("http://localhost/admin", { headers: new Headers(await headers()) });
  const admin = getApplication().auth.read(request, "admin");
  if (!admin) redirect("/admin/login");
  return <AdminDashboard adminEmail={admin.sub} />;
}
