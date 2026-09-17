import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  const { data: profile } = claims?.sub
    ? await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", claims.sub)
        .single()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-8">
        <p className="text-sm text-slate-500">
          Welcome back
        </p>

        <h1 className="text-2xl font-bold text-slate-900">
          {profile?.full_name ?? "Staff"}
        </h1>

        <p className="mt-1 text-sm capitalize text-slate-500">
          {profile?.role ?? "staff"}
        </p>
      </div>

      <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Today
        </p>

        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          No events scheduled yet
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Upcoming services and church events will appear here.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <a
            href="/members"
            className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
          >
            <div className="font-semibold text-slate-900">
              Members
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Manage church members
            </div>
          </a>

          <a
            href="/events"
            className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
          >
            <div className="font-semibold text-slate-900">
              Events
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Manage services
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}