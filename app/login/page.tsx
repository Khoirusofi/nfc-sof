import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink">Masuk</h1>
        <p className="mt-2 text-sm text-ink/60">
          Kelola kartu dan ubah tujuan link Google Review Anda.
        </p>
      </div>
      <LoginForm redirectTo={searchParams.redirect} />
    </main>
  );
}
