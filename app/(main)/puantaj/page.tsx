"use client";

import { Suspense, useEffect } from "react";
import { PuantajClient } from "./PuantajClient";
import { useRouter, useSearchParams } from "next/navigation";
import { usePuantajMonths } from "./hooks/usePuantaj";

function PuantajPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const realDate = new Date();
  const realMonth = realDate.getMonth() + 1;
  const realYear = realDate.getFullYear();

  const rawMonth = searchParams.get("month");
  const rawYear = searchParams.get("year");

  const currentMonth = parseInt(rawMonth || String(realMonth));
  const currentYear = parseInt(rawYear || String(realYear));

  const { data: monthData, isLoading, error } = usePuantajMonths(currentYear, currentMonth);

  useEffect(() => {
    if (monthData?.redirectUrl) {
      router.replace(monthData.redirectUrl);
    }
  }, [monthData, router]);

  if (error) {
    return <div className="p-8 text-red-500">Oturum açmanız gerekiyor veya bir hata oluştu.</div>;
  }

  // To prevent flash of incorrect month content before redirect
  if (isLoading || monthData?.redirectUrl) {
    return (
      <div className="flex flex-col min-h-screen w-full items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const initializedMonths = monthData?.initializedMonths || [];
  const dbMonths = monthData?.dbMonths || [];

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

export default function PuantajPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen w-full items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PuantajPageContent />
    </Suspense>
  );
}
