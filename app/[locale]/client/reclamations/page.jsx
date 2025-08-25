// app/[locale]/client/reclamations/page.jsx
"use client";

import dynamic from "next/dynamic";

const ReclamationClient = dynamic(() => import("./ReclamationClient"), {
  ssr: false,
});

export default function Page() {
  return <ReclamationClient userIdFromProps={null} />;
}
