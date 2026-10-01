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

  const realDate = new Date();
  const realMonth = realDate.getMonth() + 1;
  const realYear = realDate.getFullYear();

  const rawMonth = searchParams.month;
  const rawYear = searchParams.year;

  const currentMonth = parseInt(rawMonth || String(realMonth));
  const currentYear = parseInt(rawYear || String(realYear));

  const requestedMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  if (initializedMonths.length > 0) {
    if (!initializedMonths.includes(requestedMonthKey)) {
      // Sort initialized months to find the latest
      const sortedMonths = [...initializedMonths].sort();
      const latestMonthKey = sortedMonths[sortedMonths.length - 1]; // format: YYYY-MM
      const [latestYear, latestMonth] = latestMonthKey.split('-');

      redirect(`/puantaj?month=${parseInt(latestMonth)}&year=${parseInt(latestYear)}`);
    }
  } else {
    // If empty array, force redirect to real current month if they are not already there
    if (currentMonth !== realMonth || currentYear !== realYear || !rawMonth || !rawYear) {
      redirect(`/puantaj?month=${realMonth}&year=${realYear}`);
    }
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
