import Link from "next/link";

export default function HomePage({
  searchParams,
}: {
  searchParams: { invalid_card?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-medium text-ink">NFC Review Card</h1>
      <p className="mt-2 text-sm text-ink/60">
        Placeholder landing page — full marketing design comes in a later
        stage, once the core redirect/activation flow is confirmed working
        end-to-end.
      </p>
      <Link
        href="/login"
        className="mt-4 text-sm font-medium text-accent hover:underline"
      >
        Sudah punya kartu? Masuk ke dashboard
      </Link>

      {searchParams.invalid_card && (
        <p className="mt-6 rounded-card bg-red-50 px-4 py-3 text-sm text-red-700">
          Kode kartu &quot;{searchParams.invalid_card}&quot; tidak ditemukan.
        </p>
      )}
    </main>
  );
}
