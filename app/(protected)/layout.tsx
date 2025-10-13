// Layout with game context
"use client";
import { AppProvider } from "@/context/AppProvider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AppProvider>
        {children}
      </AppProvider>
  )
}