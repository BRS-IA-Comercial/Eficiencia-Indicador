
"use client";

import { LayoutDashboard, FileText, Truck, Settings, History, HelpCircle, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { icon: LayoutDashboard, label: "Painel de Controle", id: "dashboard" },
  { icon: FileText, label: "Entrada IA", id: "intake" },
  { icon: Truck, label: "Ocorrências", id: "delivery" },
  { icon: History, label: "Histórico", id: "history" },
];

const secondaryItems = [
  { icon: Settings, label: "Configurações", id: "settings" },
  { icon: HelpCircle, label: "Suporte", id: "support" },
];

export function SidebarNav({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-6 px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-primary rounded-lg p-2 shrink-0">
            <LayoutDashboard className="text-primary-foreground h-5 w-5" />
          </div>
          <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden">Vision Fluxo</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Processo Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.id} 
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator />
        
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.id} 
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:bg-transparent">
          <Avatar className="h-9 w-9 border-2 border-primary/20 shrink-0">
            <AvatarImage src="https://picsum.photos/seed/user-vision/200/200" alt="Usuário Administrador" />
            <AvatarFallback>GF</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold truncate">Gestor de Fluxo</span>
            <span className="text-xs text-muted-foreground truncate">gestor@fluxo.com</span>
          </div>
          <SidebarMenuButton className="ml-auto w-8 h-8 group-data-[collapsible=icon]:hidden" tooltip="Sair">
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
