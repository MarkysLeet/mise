import { Metadata } from "next";
import { PuantajClient } from "./PuantajClient";
import { getEmployees, getPuantajEntries } from "@/actions/puantaj";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Puantaj | Quiet Luxury",
};

export default async function PuantajPage(props: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Oturum açmanız gerekiyor.</div>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("initialized_months")
    .eq("id", profile?.workspace_id)
    .single();

  const initializedMonths = workspace?.initialized_months || [];

  const date = new Date();
  const rawMonth = searchParams.month;
  const rawYear = searchParams.year;

  let currentMonth = parseInt(rawMonth || String(date.getMonth() + 1));
  let currentYear = parseInt(rawYear || String(date.getFullYear()));

  const requestedMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Redirect logic if accessed without params and current month is not initialized
  if (!rawMonth && !rawYear && initializedMonths.length > 0 && !initializedMonths.includes(requestedMonthKey)) {
    // Sort initialized months to find the latest
    const sortedMonths = [...initializedMonths].sort();
    const latestMonthKey = sortedMonths[sortedMonths.length - 1]; // format: YYYY-MM
    const [latestYear, latestMonth] = latestMonthKey.split('-');

    redirect(`/puantaj?month=${parseInt(latestMonth)}&year=${parseInt(latestYear)}`);
  }

  const employees = await getEmployees(currentYear, currentMonth);
  const entries = await getPuantajEntries(currentYear, currentMonth);

  return (
    <div className="flex flex-col min-h-screen w-full">
      <PuantajClient
        key={`${currentYear}-${currentMonth}`}
        initialEmployees={employees}
        initialEntries={entries}
        currentMonth={currentMonth}
        currentYear={currentYear}
        initializedMonths={initializedMonths}
      />
    </div>
  );
}
