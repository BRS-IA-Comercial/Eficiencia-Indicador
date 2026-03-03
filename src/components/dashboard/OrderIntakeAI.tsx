
"use client";

import { useState } from "react";
import { FileUp, Loader2, CheckCircle2, AlertCircle, ShoppingCart, User, MapPin, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { extractOrderData, type OrderDataExtractorOutput } from "@/ai/flows/order-data-extractor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function OrderIntakeAI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderDataExtractorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const data = await extractOrderData({ pdfDataUri: base64 });
          setResult(data);
        } catch (err) {
          setError("Falha ao processar o documento. Certifique-se de que é um PDF válido.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Erro ao ler o arquivo.");
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Process Order Document
          </CardTitle>
          <CardDescription>
            Upload a PDF order intake document to automatically extract and categorize data using Vision Fluxo AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <label className="cursor-pointer group flex flex-col items-center gap-4">
            <div className="bg-primary group-hover:bg-primary/90 rounded-full p-6 text-white shadow-lg transition-all transform group-hover:scale-110">
              {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <FileUp className="h-8 w-8" />}
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Click to select PDF</p>
              <p className="text-sm text-muted-foreground">or drag and drop file here</p>
            </div>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={loading}
            />
          </label>
        </CardContent>
      </Card>

      {result ? (
        <Card className="animate-in fade-in slide-in-from-right-4 duration-500 shadow-xl border-primary/20">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Extracted Order: #{result.orderId}</CardTitle>
                <CardDescription>Order detected as <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">{result.orderCategory}</Badge></CardDescription>
              </div>
              <CheckCircle2 className="text-primary h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><User className="h-3 w-3"/> Customer</span>
                <p className="font-medium">{result.customerName}</p>
                <p className="text-sm text-muted-foreground italic">{result.customerEmail}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><Calendar className="h-3 w-3"/> Order Date</span>
                <p className="font-medium">{new Date(result.orderDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
               <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><MapPin className="h-3 w-3"/> Shipping Address</span>
               <p className="text-sm leading-snug">{result.customerAddress}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><ShoppingCart className="h-3 w-3"/> Line Items</span>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                {result.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-muted/40 p-2 rounded">
                    <span>{item.quantity}x {item.productName}</span>
                    <span className="font-mono">{result.currency} {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center bg-primary text-primary-foreground p-4 rounded-xl shadow-inner">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold opacity-80 flex items-center gap-1"><CreditCard className="h-3 w-3"/> Total Amount</span>
                <p className="text-2xl font-bold">{result.currency} {result.totalAmount.toFixed(2)}</p>
              </div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {result.paymentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="flex items-center justify-center border-none bg-transparent">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground animate-pulse">Vision AI is scanning the document...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5 flex items-center justify-center">
          <div className="text-center space-y-3 p-6">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setError(null)}>Tentar novamente</Button>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-center p-12 text-muted-foreground italic text-center border-2 border-dashed border-muted rounded-xl">
           Results will appear here once processed.
        </div>
      )}
    </div>
  );
}
