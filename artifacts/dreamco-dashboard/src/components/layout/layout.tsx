import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="h-14 border-b border-border/40 flex items-center px-4 md:hidden">
            <SidebarTrigger />
            <div className="ml-4 font-mono font-bold text-primary tracking-widest text-sm">
              DREAMCO_OS //
            </div>
          </div>
          <div className="p-6 md:p-8 h-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
