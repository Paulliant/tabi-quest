import { getSupabaseConfig, supabaseRestFetch } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SupabaseTestRow = {
  name: string;
};

export async function GET() {
  try {
    getSupabaseConfig();
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supabase configuration is invalid.",
      },
      { status: 500 },
    );
  }

  // SQL equivalent:
  // SELECT name FROM test WHERE id = 1 LIMIT 1;
  const response = await supabaseRestFetch("test?select=name&id=eq.1&limit=1");

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
