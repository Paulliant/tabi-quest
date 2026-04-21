const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY, or their NEXT_PUBLIC_* equivalents.",
    );
  }

  return { supabaseUrl, supabaseKey };
}

export async function supabaseRestFetch(path: string) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });
}
