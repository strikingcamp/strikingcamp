"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  adminName: string;
}

export default function AdminLayoutClient({
  children,
  adminName,
}: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-black text-brand-white flex print:block print:bg-white print:min-h-0">
      {/* Sidebar */}
      <div className="print:hidden">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 print:pl-0 print:block">
        <div className="print:hidden">
          <AdminHeader
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            adminName={adminName}
          />
        </div>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
