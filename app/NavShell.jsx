"use client";

import TopNav from "./components/nav/TopNav";
import BottomAppBar from "./components/nav/BottomAppBar";
import Toaster from "./components/ui/Toaster";

export default function NavShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopNav />
      <Toaster />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:pt-10">{children}</main>
      <BottomAppBar />
    </div>
  );
}
