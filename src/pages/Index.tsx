import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Truck, Zap, Lock, Package, ChevronRight, MapPin, Gift, Star } from "lucide-react";
import { toast } from "sonner";
import checkoutBanner from "@/assets/checkout-banner.jpg";
import selosSeguranca from "@/assets/selos-seguranca-clean.png";
import bannerSaoBento from "@/assets/banner-sao-bento.png";
import bannerNossaSenhora from "@/assets/banner-nossa-senhora.png";
import tercoSaoBento from "@/assets/terco-sao-bento-real.webp";
import tercoNossaSenhora from "@/assets/terco-nossa-senhora-real.png";
import caixaSaoBento from "@/assets/caixa-sao-bento.jpg";
import caixaNossaSenhora from "@/assets/caixa-nossa-senhora.jpg";
import caixa1 from "@/assets/caixa1.png";
import caixa2 from "@/assets/caixa2.png";
import caixaSaoBento1 from "@/assets/caixasaobento1.png";
import caixaSaoBento2 from "@/assets/caixasaobento2.png";
import review1 from "@/assets/prova23.png";
import review2 from "@/assets/prova34.png";
import review3 from "@/assets/prova24.png";
import correiosLogo from "@/assets/correios-logo.png";
import logoPix from "@/assets/logo-pix.png";

type ProductVariant = "sao-bento" | "nossa-senhora";

const PRODUCTS: Record<ProductVariant, { name: string; image: string; giftBoxImage: string; banner: string }> = {
  "sao-bento": {
    name: "Terço Católico de Contemplação dos Mistérios - São Bento",
    image: tercoSaoBento,
    giftBoxImage: caixaSaoBento,
    banner: bannerSaoBento,
  },
  "nossa-senhora": {
    name: "Terço Católico de Contemplação dos Mistérios - Nossa Senhora Aparecida",
    image: tercoNossaSenhora,
    giftBoxImage: caixaNossaSenhora,
    banner: bannerNossaSenhora,
  },
};

const REVIEWS = [
  {
    name: "Maria Aparecida",
    location: "São Paulo-SP",
    photo: review1,
    text: "Recebi meu terço e fiquei emocionada! A qualidade é incrível e chegou muito bem embalado. Recomendo de olhos fechados!",
  },
  {
    name: "Carlos Eduardo",
    location: "Rio de Janeiro-RJ",
    photo: review2,
    text: "Comprei para presentear minha mãe e ela amou. O acabamento é perfeito e o material muito resistente.",
  },
  {
    name: "Eliza de Almeida",
    location: "Belo Horizonte-MG",
    photo: review3,
    text: "Já é o terceiro que compro para dar de presente. Todos ficaram encantados. Entrega rápida e produto maravilhoso!",
  },
];

const OrderBumpCarousel = ({ images }: { images: string[] }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`Caixa de presente ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          width={80}
          height={80}
        />
      ))}
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [semEmail, setSemEmail] = useState(false);
  const [telefone, setTelefone] = useState("");

  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepValidated, setCepValidated] = useState(false);

  const [frete, setFrete] = useState("");
  const [orderBump, setOrderBump] = useState(false);

  const [showAddress, setShowAddress] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read product variant and quantity from URL params, fallback to localStorage
  const [searchParams] = useSearchParams();

  const [variant, setVariant] = useState<ProductVariant>(() => {
    const modelo = searchParams.get("modelo");
    if (modelo) {
      const normalized = modelo.trim().toLowerCase();
      if (normalized.includes("nossa") || normalized.includes("aparecida") || normalized === "nossa-senhora") {
        return "nossa-senhora";
      }
      return "sao-bento";
    }
    try {
      const stored = localStorage.getItem("selectedModel") || localStorage.getItem("selectedProduct") || localStorage.getItem("selected_product") || localStorage.getItem("terco");
      if (stored) {
        const normalized = stored.replace(/['"]/g, "").trim().toLowerCase();
        if (normalized.includes("nossa") || normalized.includes("aparecida")) {
          return "nossa-senhora";
        }
      }
    } catch {}
    return "sao-bento";
  });

  const product = PRODUCTS[variant];

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  useEffect(() => {
    if (telefone.replace(/\D/g, "").length === 11) setShowAddress(true);
  }, [telefone]);

  // CEP auto-fill via ViaCEP
  useEffect(() => {
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      setCepValidated(false);
      return;
    }
    const fetchCep = async () => {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast.error("CEP não encontrado. Verifique e tente novamente.");
          setCepValidated(false);
        } else {
          setEndereco(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setEstado(data.uf || "");
          setCepValidated(true);
        }
      } catch {
        toast.error("Erro ao buscar CEP. Tente novamente.");
        setCepValidated(false);
      } finally {
        setCepLoading(false);
      }
    };
    fetchCep();
  }, [cep]);

  useEffect(() => {
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length === 8 && cepValidated && endereco.trim() && numero.trim() && bairro.trim() && cidade.trim() && estado.trim()) {
      setShowShipping(true);
    }
  }, [cep, cepValidated, endereco, numero, bairro, cidade, estado]);

  useEffect(() => {
    if (frete) setShowSummary(true);
  }, [frete]);

  // Capture UTM from URL (reuse searchParams from above)
  const utm = searchParams.toString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || (!semEmail && !email.trim()) || !telefone.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    if (!semEmail && !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Insira um e-mail válido.");
      return;
    }
    setIsSubmitting(true);

    try {
      const totalCents = Math.round(total * 100);
      const { data, error } = await supabase.functions.invoke("create-pix-charge", {
        body: {
          amount: totalCents,
          customer: {
            name: nome,
            document: "52998224725",
            email: email,
            phone: telefone,
          },
          item: {
            title: product.name,
            price: Math.round(precoAtual * 100),
            quantity: quantidade,
          },
          utm,
          orderBump,
          shippingMethod: frete,
          variant,
          quantity: quantidade,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      navigate("/pix", {
        state: {
          total,
          pixCode: data.pixCode,
          transactionId: data.transactionId,
        },
      });
    } catch (err: any) {
      console.error("PIX charge error:", err);
      toast.error("Erro ao gerar o código Pix. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  const [quantidade, setQuantidade] = useState(() => {
    const qtyParam = searchParams.get("qty");
    if (qtyParam) {
      const parsed = parseInt(qtyParam, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    try {
      const stored = localStorage.getItem("selectedQty");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 1) return parsed;
      }
    } catch {}
    return 1;
  });

  const calcSubtotal = (qty: number) => {
    if (qty <= 0) return 0;
    if (qty === 1) return 19;
    if (qty === 2) return 29;
    if (qty === 3) return 39;
    return 39 + (qty - 3) * 19;
  };

  const calcOriginal = (qty: number) => {
    if (qty <= 0) return 0;
    if (qty === 1) return 29;
    if (qty === 2) return 69;
    if (qty === 3) return 89;
    return 89 + (qty - 3) * 29;
  };

  const precoAtual = calcSubtotal(quantidade) / quantidade;
  const precoOriginal = calcOriginal(quantidade);
  const freteValor = frete === "sedex" ? 12.9 : 0;
  const orderBumpValor = 14.9;
  const subtotal = calcSubtotal(quantidade);
  const total = subtotal + freteValor + (orderBump ? orderBumpValor : 0);

  const currentStep = !showAddress ? 1 : !showShipping ? 2 : 3;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-8 rounded-xl overflow-hidden">
          <img src={product.banner} alt="Banner promocional" className="w-full h-auto object-cover" width={1920} height={512} />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm">
          {[
            { n: 1, label: "Dados" },
            { n: 2, label: "Endereço" },
            { n: 3, label: "Pagamento" },
          ].map(({ n, label }, i) => (
            <span key={n} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mr-1" />}
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</span>
              <span className={currentStep >= n ? "text-primary font-semibold" : "text-muted-foreground"}>{label}</span>
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-5 gap-6">
            {/* Left column */}
            <div className="md:col-span-3 space-y-5">
              {/* Step 1 */}
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Informações Pessoais
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="nome" className="text-xs text-muted-foreground uppercase tracking-wide">Nome completo</Label>
                      <Input id="nome" placeholder="Ex: Maria da Silva" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</Label>
                      <Input id="email" type="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${semEmail ? "bg-muted text-muted-foreground" : "bg-background"}`} disabled={semEmail} />
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox id="sem-email" checked={semEmail} onCheckedChange={(checked) => {
                          const val = !!checked;
                          setSemEmail(val);
                          if (val) setEmail("sememail@cliente.com");
                          else setEmail("");
                        }} />
                        <Label htmlFor="sem-email" className="text-sm font-normal cursor-pointer">Não tenho e-mail</Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="telefone" className="text-xs text-muted-foreground uppercase tracking-wide">Telefone / WhatsApp</Label>
                      <Input id="telefone" type="tel" placeholder="(99) 99999-9999" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} className="mt-1 bg-background" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Address */}
              {showAddress && (
                <Card className="border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Endereço de Entrega
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="cep" className="text-xs text-muted-foreground uppercase tracking-wide">CEP</Label>
                        <div className="relative">
                          <Input id="cep" placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCep(e.target.value))} className="mt-1 bg-background" />
                          {cepLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>

                      {cepValidated && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="estado" className="text-xs text-muted-foreground uppercase tracking-wide">Estado (UF)</Label>
                              <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} className="mt-1 bg-background" />
                            </div>
                            <div>
                              <Label htmlFor="cidade" className="text-xs text-muted-foreground uppercase tracking-wide">Cidade</Label>
                              <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className="mt-1 bg-background" />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="bairro" className="text-xs text-muted-foreground uppercase tracking-wide">Bairro</Label>
                            <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className="mt-1 bg-background" />
                          </div>
                          <div>
                            <Label htmlFor="endereco" className="text-xs text-muted-foreground uppercase tracking-wide">Endereço</Label>
                            <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="mt-1 bg-background" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="numero" className="text-xs text-muted-foreground uppercase tracking-wide">Número</Label>
                              <Input id="numero" placeholder="123" value={numero} onChange={(e) => setNumero(e.target.value)} className="mt-1 bg-background" autoFocus />
                            </div>
                            <div>
                              <Label htmlFor="complemento" className="text-xs text-muted-foreground uppercase tracking-wide">Complemento</Label>
                              <Input id="complemento" placeholder="Apto, Bloco..." value={complemento} onChange={(e) => setComplemento(e.target.value)} className="mt-1 bg-background" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method */}
              {showShipping && (
                <Card className="border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      Método de Pagamento
                    </h2>
                    <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5">
                      <img src={logoPix} alt="Pix" className="h-8 w-8 shrink-0 object-contain" />
                      <div className="flex-1">
                        <span className="font-semibold text-foreground text-sm">Pix</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Aprovação instantânea</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shipping */}
              {showShipping && (
                <Card className="border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      Opções de Frete
                    </h2>
                    <RadioGroup value={frete} onValueChange={setFrete} className="space-y-3">
                      <label htmlFor="frete-gratis" className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${frete === "gratis" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                        <RadioGroupItem value="gratis" id="frete-gratis" />
                        <Truck className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-sm">Frete Grátis</span>
                            <span className="text-sm font-bold text-primary">GRÁTIS</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Entrega em 10 a 15 dias úteis</p>
                        </div>
                      </label>
                      <label htmlFor="frete-sedex" className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${frete === "sedex" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                        <RadioGroupItem value="sedex" id="frete-sedex" />
                        <img src={correiosLogo} alt="Correios" className="h-5 w-5 shrink-0 object-contain" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-sm">Sedex Expresso</span>
                            <span className="text-sm font-bold text-foreground">R$ 12,90</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Entrega em 2 a 3 dias úteis</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Right column - Summary */}
            <div className="md:col-span-2">
              <div className="sticky top-6 space-y-5">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-foreground text-sm">Resumo do Pedido</h2>

                    {/* Product details */}
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover border border-border" loading="lazy" width={64} height={64} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">Este terço é uma ferramenta pedagógica de fé com placas indicativas dos Mistérios para meditação profunda.</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button type="button" onClick={() => setQuantidade(Math.max(1, quantidade - 1))} className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted text-xs font-bold">−</button>
                          <span className="text-sm font-semibold text-foreground w-6 text-center">{quantidade}</span>
                          <button type="button" onClick={() => setQuantidade(quantidade + 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted text-xs font-bold">+</button>
                        </div>
                      </div>
                    </div>

                    {/* Order Bump */}
                    {showSummary && (
                      <>
                        <Separator />
                        <label className="flex items-start gap-3 cursor-pointer rounded-lg border-2 border-accent/50 p-3 shadow-md shadow-accent/10 hover:border-accent transition-all">
                          <OrderBumpCarousel images={variant === "sao-bento" ? [caixaSaoBento1, caixaSaoBento2] : [caixa1, caixa2]} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Gift className="h-4 w-4 text-accent" />
                              <span className="font-bold text-foreground text-sm">Caixa de Presente</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">Embalagem premium exclusiva.</p>
                            <div className="flex items-end justify-between">
                              <span className="text-sm font-bold text-accent">+ R$ {orderBumpValor.toFixed(2).replace(".", ",")}</span>
                              <Checkbox checked={orderBump} onCheckedChange={(checked) => setOrderBump(checked === true)} className="border-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent" />
                            </div>
                          </div>
                        </label>
                      </>
                    )}

                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal ({quantidade}x)</span>
                        <span className="line-through">R$ {precoOriginal.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="flex justify-between text-foreground">
                        <span>Preço com desconto</span>
                        <span className="font-semibold">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                      </div>
                      {orderBump && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Caixa de Presente</span>
                          <span>R$ {orderBumpValor.toFixed(2).replace(".", ",")}</span>
                        </div>
                      )}
                      {frete && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Frete</span>
                          <span className={frete === "gratis" ? "text-primary font-semibold" : ""}>{frete === "gratis" ? "Grátis" : `R$ ${freteValor.toFixed(2).replace(".", ",")}`}</span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="text-xl font-bold text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                    </div>

                    <Button type="submit" disabled={!showSummary || isSubmitting} className="w-full h-12 text-base font-bold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md transition-all">
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Finalizando pedido...
                        </span>
                      ) : "FINALIZAR PEDIDO"}
                    </Button>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      <span>Pagamento 100% Seguro</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Security seals */}
                <div className="flex justify-center">
                  <img src={selosSeguranca} alt="Selos de segurança - Reclame Aqui, Google Safe Browsing, SSL Certificado" className="w-3/4 h-auto object-contain mx-auto" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Social proof footer */}
        <div className="mt-16 mb-8">
          <h3 className="text-lg font-bold text-foreground text-center mb-6">O que nossos clientes dizem</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {REVIEWS.map((review) => (
              <Card key={review.name} className="border-border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={review.photo} alt={review.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{review.name} | {review.location} 🇧🇷</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">"{review.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
