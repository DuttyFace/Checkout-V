import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2, Smartphone, QrCode, ShieldCheck } from "lucide-react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

interface OrderData {
  total: number;
  pixCode: string;
  transactionId: string;
}

const PixPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderData = location.state as OrderData | null;
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Poll for payment status
  useEffect(() => {
    if (!orderData?.transactionId || loading) return;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-pix-status", {
          method: "GET",
          body: undefined,
          headers: {},
        });
        // Use query params approach via invoke workaround
      } catch {}
    };

    // Use fetch directly for GET with query params
    const pollStatus = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/check-pix-status?transactionId=${encodeURIComponent(orderData.transactionId)}`,
          {
            headers: {
              "Authorization": `Bearer ${anonKey}`,
              "apikey": anonKey,
            },
          }
        );
        const data = await res.json();
        if (data.status === "COMPLETED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          toast.success("Pagamento confirmado!");
          window.location.href = "https://rosamisteriopedido.vercel.app/frete";
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    pollingRef.current = setInterval(pollStatus, 5000);
    // Stop after 15 minutes
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, 15 * 60 * 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [orderData, loading, navigate]);

  if (!orderData) {
    return <Navigate to="/" replace />;
  }

  const { total, pixCode, transactionId } = orderData;

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center gap-4">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-semibold text-foreground animate-pulse">Gerando seu código Pix...</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode).then(() => {
      setCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-1 md:mb-2 leading-tight">
          Falta pouco! Para finalizar a compra,
        </h1>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-6 md:mb-8 leading-tight">
          escaneie o QR Code abaixo.
        </p>

        <div className="flex flex-col md:grid md:grid-cols-5 gap-4 md:gap-6">
          {/* QR Code Card */}
          <div className="md:col-span-3 order-1 md:order-1">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 sm:p-6 flex flex-col items-center space-y-4 sm:space-y-5">
                {/* QR Code */}
                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-inner border border-border">
                  <QRCodeSVG value={pixCode} size={256} className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64" />
                </div>

                <Separator className="w-3/4" />

                <p className="text-xs sm:text-sm text-foreground text-center">
                  Se preferir, pague com a opção <strong>PIX Copia e Cola</strong>
                </p>

                <div className="w-full">
                  <div className="bg-muted rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs text-muted-foreground font-mono truncate border border-border">
                    {pixCode}
                  </div>
                </div>

                <Button
                  onClick={handleCopy}
                  className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-bold tracking-wide text-white rounded-lg shadow-md"
                  style={{ backgroundColor: copied ? "#02b854" : "#03D361" }}
                >
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {copied ? "CÓDIGO COPIADO!" : "COPIAR CÓDIGO PIX"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Details & Instructions */}
          <div className="md:col-span-2 space-y-4 md:space-y-5 order-2 md:order-2">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between sm:block">
                  <h2 className="font-semibold text-foreground text-sm sm:text-base">Detalhes da compra:</h2>
                  <span className="text-base sm:text-lg font-bold text-primary sm:hidden">
                    R$ {total.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <Separator className="hidden sm:block" />
                <div className="hidden sm:block">
                  <span className="text-sm text-muted-foreground">Valor total: </span>
                  <span className="text-lg font-bold text-primary">
                    R$ {total.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <Separator />
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Instruções para pagamento</h2>

                <div className="space-y-3 sm:space-y-4 mt-1 sm:mt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-1.5">
                      Aperte em <strong className="text-foreground">"Copiar Código Pix"</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-1.5">
                      Acesse <strong className="text-foreground">"Pix Copia e Cola"</strong> no app do banco.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-1.5">
                      Cole o código e <strong className="text-foreground">confirme o pagamento</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pb-4 md:pb-0">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Pagamento 100% Seguro via Pix</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixPayment;
