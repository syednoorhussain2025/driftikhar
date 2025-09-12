"use client";

import dynamic from "next/dynamic";

// Load the existing Header component only on the client.
const Header = dynamic(() => import("./Header"), { ssr: false });

export default function ClientOnlyHeader() {
  return <Header />;
}
