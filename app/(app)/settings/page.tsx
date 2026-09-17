import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  const { data: profile } = claims?.sub
    ? await supabase
        .from("profiles")
        .select("full_name, role, is_active")
        .eq("id", claims.sub)
        .single()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Account and application settings.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="border-b pb-4">
          <p className="text-xs uppercase text-slate-400">
            Staff Account
          </p>

          <h2 className="mt-1 font-semibold text-slate-900">
            {profile?.full_name ?? "Staff"}
          </h2>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Role
            </span>

            <span className="text-sm font-medium capitalize text-black">
              {profile?.role ?? "staff"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Status
            </span>

            <span className="text-sm font-medium text-black">
              {profile?.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}