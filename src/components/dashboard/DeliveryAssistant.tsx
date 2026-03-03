
"use client";

import { useState } from "react";
import { Send, Bot, User, Lightbulb, CheckCircle, Package, MapPin, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const suggestions = [
  "Endereço não localizado no CEP informado",
  "Destinatário ausente em 3 tentativas",
  "Carga extraviada no centro de distribuição",
];

export function DeliveryAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Olá! Sou o Assistente de Ocorrências. Como posso ajudar com os problemas de entrega hoje?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Resposta simulada da IA
    setTimeout(() => {
      const assistantMsg = { 
        role: "assistant", 
        content: `Analisei a ocorrência "${input}". Com base nos dados históricos, recomendo verificar se o motorista confirmou a geolocalização do ponto de entrega. Em 65% desses casos, o re-agendamento para o período matutino resolve o problema.`
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      <div className="lg:col-span-2 flex flex-col gap-4 h-full">
        <Card className="flex-1 flex flex-col shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Assistente de IA de Entregas</CardTitle>
                <CardDescription className="text-primary-foreground/70">Especialista em resolução de exceções logísticas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-secondary/50 text-foreground rounded-bl-none border"
                    }`}>
                      {msg.role === "assistant" && <Bot className="h-5 w-5 shrink-0" />}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.role === "user" && <User className="h-5 w-5 shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 border-t bg-muted/20">
            <div className="flex w-full gap-2">
              <Input 
                placeholder="Digite os detalhes do problema de entrega..." 
                className="flex-1 bg-background"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend} className="bg-primary hover:bg-primary/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm border-accent/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-accent" />
              Exceções Comuns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-left text-xs h-auto py-2 hover:bg-accent/10"
                onClick={() => setInput(s)}
              >
                {s}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Ocorrências Críticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
               <Package className="h-5 w-5 text-red-500 shrink-0" />
               <div className="text-xs">
                 <p className="font-bold">NF #99281 - Extravio</p>
                 <p className="text-muted-foreground mt-1">Sugerido: Re-faturamento imediato via AI Flow.</p>
                 <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-red-600 font-bold uppercase mt-2">Resolver agora</Button>
               </div>
            </div>
            <div className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
               <MapPin className="h-5 w-5 text-orange-500 shrink-0" />
               <div className="text-xs">
                 <p className="font-bold">NF #99312 - Endereço</p>
                 <p className="text-muted-foreground mt-1">Sugerido: Contato via WhatsApp Automático.</p>
                 <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-orange-600 font-bold uppercase mt-2">Enviar contato</Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
