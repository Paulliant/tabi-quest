export const dynamic = "force-dynamic";

type SupabaseTestRow = {
  name: string;
};

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      {
        error:
          "Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY, or their NEXT_PUBLIC_* equivalents.",
      },
      { status: 500 },
    );
  }

  // SQL equivalent:
  // SELECT name FROM test WHERE id = 1 LIMIT 1;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/test?select=name&id=eq.1&limit=1`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return Response.json(
      { error: "Failed to fetch player name from Supabase." },
      { status: response.status },
    );
  }

  const rows = (await response.json()) as SupabaseTestRow[];
  const name = rows[0]?.name;

  if (!name) {
    return Response.json(
      { error: "No row found in test table for id = 1." },
      { status: 404 },
    );
  }

  return Response.json({ name });
}
