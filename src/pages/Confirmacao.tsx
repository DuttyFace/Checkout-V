import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useLocation, Navigate } from "react-router-dom";

const Confirmacao = () => {
  const location = useLocation();
  const state = location.state as { paidAt?: string } | null;

  if (!state) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <Card className="max-w-md w-full border-border shadow-sm">
        <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pagamento Confirmado!</h1>
          <p className="text-sm text-muted-foreground">
            Seu pagamento foi recebido com sucesso. Você receberá um e-mail com os detalhes do pedido e informações de rastreamento.
          </p>
          <p className="text-xs text-muted-foreground">Obrigado pela sua compra!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Confirmacao;
