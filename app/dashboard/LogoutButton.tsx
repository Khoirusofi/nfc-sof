"use client";

import { logoutAction } from "@/app/login/actions";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="text-sm text-ink/60 hover:text-ink">
        Keluar
      </button>
    </form>
  );
}
