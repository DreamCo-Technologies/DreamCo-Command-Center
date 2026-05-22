import { Link, useLocation } from "wouter";
import { 
  Terminal, 
  Activity, 
  Bot, 
  DollarSign, 
  GitMerge, 
  Network,
  Zap
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: Activity },
  { title: "Bot Registry", url: "/bots", icon: Bot },
  { title: "Buddy AI", url: "/buddy", icon: Terminal },
  { title: "Revenue", url: "/revenue", icon: DollarSign },
  { title: "Repositories", url: "/github", icon: GitMerge },
  { title: "Divisions", url: "/divisions", icon: Network },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar variant="sidebar" className="border-r border-border/40 bg-sidebar">
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/40 justify-center">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="h-5 w-5 fill-primary" />
          <span className="font-mono font-bold tracking-widest text-sm uppercase">DREAMCO_OS</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">Systems</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url} className={`flex items-center gap-3 font-mono text-sm ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
