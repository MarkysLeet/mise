import { Metadata } from "next";
import { PuantajClient } from "./PuantajClient";
import { getEmployees, getPuantajEntries } from "@/actions/puantaj";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Puantaj | Quiet Luxury",
};

export default async function PuantajPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Oturum açmanız gerekiyor.</div>;
  }

  const date = new Date();
  const currentMonth = parseInt(searchParams.month || String(date.getMonth() + 1));
  const currentYear = parseInt(searchParams.year || String(date.getFullYear()));

  const employees = await getEmployees();
  const entries = await getPuantajEntries(currentYear, currentMonth);

  return (
    <div className="flex flex-col min-h-screen w-full">
      <PuantajClient
        key={`${currentYear}-${currentMonth}`}
        initialEmployees={employees}
        initialEntries={entries}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </div>
  );
}
