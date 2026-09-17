export default function AccountDisabledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 text-center shadow-sm">
        <div className="mb-4 text-4xl">
          🔒
        </div>

        <h1 className="text-xl font-bold text-slate-900">
          Account Disabled
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your staff account has been disabled.
          Please contact the church administrator.
        </p>
      </div>
    </main>
  );
}