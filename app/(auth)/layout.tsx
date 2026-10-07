export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex-1 h-screen overflow-y-auto bg-stone-50/50 w-full">
      {children}
    </main>
  );
}
