import Link from "next/link";
import LogoutButton from "@/app/dashboard/LogoutButton";

export default function AdminNav() {
  return (
    <nav className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/admin" className="font-medium text-ink">
          Admin
        </Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
