import { requireAdminPage } from "@/lib/auth/admin";
import AdminNav from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This protects navigation to any page under /admin. It does NOT protect
  // the Server Actions or Route Handlers these pages call — those check
  // requireAdminApi() independently. See lib/auth/admin.ts.
  await requireAdminPage();

  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
