
"use client";

import { RefreshCw, Bell, Search, TrendingUp, Activity, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <header className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8 flex-1">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search processes, orders, reports..." className="pl-10 bg-secondary/50 border-transparent focus:bg-white focus:border-primary/20 transition-all rounded-full" />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Global S&OP</p>
              <p className="text-sm font-bold">92.4% <span className="text-primary text-[10px]">+2.1%</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Daily Load</p>
              <p className="text-sm font-bold">1.2k ops</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRefresh} className={isRefreshing ? "animate-spin" : ""}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Recarregar Dados</TooltipContent>
        </Tooltip>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
        </Button>
        
        <div className="h-8 w-px bg-border mx-2"></div>
        
        <Button className="bg-primary text-white hover:bg-primary/90 gap-2 font-semibold">
          <CheckCircle className="h-4 w-4" />
          Finalizar Turno
        </Button>
      </div>
    </header>
  );
}
