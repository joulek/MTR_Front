// app/[locale]/client/layout.jsx
"use client";

import SiteHeader from "@/components/SiteHeader"; // adapte le chemin si besoin
import { useLocale } from "next-intl";

export default function ClientLayout({ children }) {
  const locale = useLocale();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      // retour vers /[locale]/login
      window.location.href = `/${locale}/login`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader mode="client" onLogout={handleLogout} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
