import { Metadata } from "next";
import { PuantajClient } from "./PuantajClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Puantaj | Quiet Luxury",
};

export const dynamic = 'force-dynamic';

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

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Verify if requested month has entries in DB, as a fallback (auto-migration/self-healing)
  const { data: monthEntries } = await supabase
    .from("puantaj_entries")
    .select("id")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .limit(1);

  const hasEntriesInDb = monthEntries && monthEntries.length > 0;

  if (initializedMonths.length > 0) {
    if (!initializedMonths.includes(requestedMonthKey)) {
      if (hasEntriesInDb) {
        // Self-healing: if entries exist but month is not in initialized_months, add it
        initializedMonths.push(requestedMonthKey);
        await supabase
          .from("workspaces")
          .update({ initialized_months: initializedMonths })
          .eq("id", profile?.workspace_id);
      } else {
        // Sort initialized months to find the latest
        const sortedMonths = [...initializedMonths].sort();
        const latestMonthKey = sortedMonths[sortedMonths.length - 1]; // format: YYYY-MM
        const [latestYear, latestMonth] = latestMonthKey.split('-');

        redirect(`/puantaj?month=${parseInt(latestMonth)}&year=${parseInt(latestYear)}`);
      }
    }
  } else {
    if (hasEntriesInDb) {
       // Self-healing: array is empty but entries exist. Start building the array.
       initializedMonths.push(requestedMonthKey);
       await supabase
         .from("workspaces")
         .update({ initialized_months: initializedMonths })
         .eq("id", profile?.workspace_id);
    } else {
       // Check if there are ANY entries in the DB to redirect to the latest existing month
       const { data: latestEntry } = await supabase
         .from("puantaj_entries")
         .select("date")
         .order("date", { ascending: false })
         .limit(1);

       if (latestEntry && latestEntry.length > 0) {
         const latestDateStr = latestEntry[0].date;
         const [latestYear, latestMonth] = latestDateStr.split('-');
         redirect(`/puantaj?month=${parseInt(latestMonth)}&year=${parseInt(latestYear)}`);
       } else {
         // If completely empty database, force redirect to real current month if they are not already there
         if (currentMonth !== realMonth || currentYear !== realYear || !rawMonth || !rawYear) {
           redirect(`/puantaj?month=${realMonth}&year=${realYear}`);
         }
       }
    }
  }

  // Instead of querying all dates in the database (which scales poorly), we can simply
  // check if there is AT LEAST ONE entry for the previous month to unlock the navigation arrow.
  const prevMonthDateObj = new Date(currentYear, currentMonth - 2, 1);
  const prevMonthDays = new Date(prevMonthDateObj.getFullYear(), prevMonthDateObj.getMonth() + 1, 0).getDate();
  const prevMonthStart = `${prevMonthDateObj.getFullYear()}-${String(prevMonthDateObj.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEnd = `${prevMonthDateObj.getFullYear()}-${String(prevMonthDateObj.getMonth() + 1).padStart(2, '0')}-${String(prevMonthDays).padStart(2, '0')}`;
  const prevMonthKey = `${prevMonthDateObj.getFullYear()}-${String(prevMonthDateObj.getMonth() + 1).padStart(2, '0')}`;

  const { data: prevMonthEntries } = await supabase
    .from("puantaj_entries")
    .select("id")
    .gte("date", prevMonthStart)
    .lte("date", prevMonthEnd)
    .limit(1);

  const dbMonths = prevMonthEntries && prevMonthEntries.length > 0 ? [prevMonthKey] : [];

  return (
    <div className="flex flex-col min-h-screen w-full">
      <PuantajClient
        currentMonth={currentMonth}
        currentYear={currentYear}
        initializedMonths={initializedMonths}
        dbMonths={dbMonths}
      />
    </div>
  );
}
