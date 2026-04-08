import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const DUTTYFY_URL = Deno.env.get("DUTTYFY_PIX_URL_ENCRYPTED");
    if (!DUTTYFY_URL || !DUTTYFY_URL.startsWith("https://")) {
      console.error("Invalid DUTTYFY_PIX_URL_ENCRYPTED:", DUTTYFY_URL ? DUTTYFY_URL.slice(-8) : "not set");
      throw new Error("DUTTYFY_PIX_URL_ENCRYPTED not configured or invalid");
    }

    const body = await req.json();
    const { amount, customer, item, utm, orderBump, shippingMethod, variant, quantity } = body;

    // Validate required fields
    if (!amount || amount < 100) throw new Error("Invalid amount");
    if (!customer?.name || !customer?.document || !customer?.email || !customer?.phone) {
      throw new Error("Missing customer fields");
    }

    // Strip non-digits from document and phone
    const cleanDocument = customer.document.replace(/\D/g, "");
    const cleanPhone = customer.phone.replace(/\D/g, "");

    if (![11, 14].includes(cleanDocument.length)) throw new Error("Invalid document");
    if (![10, 11].includes(cleanPhone.length)) throw new Error("Invalid phone");

    const gatewayBody = {
      amount,
      customer: {
        name: customer.name,
        document: cleanDocument,
        email: customer.email,
        phone: cleanPhone,
      },
      item: {
        title: item.title,
        price: item.price,
        quantity: item.quantity,
      },
      paymentMethod: "PIX",
      ...(utm ? { utm } : {}),
    };

    // Call Duttyfy with retry on 5xx
    let lastError: Error | null = null;
    let gatewayResponse: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        gatewayResponse = await fetch(DUTTYFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gatewayBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (gatewayResponse.status < 500) break; // Don't retry on 4xx or success

        lastError = new Error(`Gateway returned ${gatewayResponse.status}`);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }

      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    if (!gatewayResponse || gatewayResponse.status >= 500) {
      throw lastError || new Error("Gateway unavailable");
    }

    if (!gatewayResponse.ok) {
      const errorBody = await gatewayResponse.text();
      throw new Error(`Gateway error ${gatewayResponse.status}: ${errorBody}`);
    }

    const data = await gatewayResponse.json();
    const { pixCode, transactionId, status } = data;

    if (!transactionId || !pixCode) {
      throw new Error("Invalid gateway response");
    }

    // Persist to DB immediately
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabase.from("pix_transactions").insert({
      transaction_id: transactionId,
      amount,
      status: status || "PENDING",
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: cleanPhone,
      customer_document: cleanDocument,
      pix_code: pixCode,
      order_bump: orderBump || false,
      shipping_method: shippingMethod || null,
      variant: variant || null,
      quantity: quantity || 1,
      utm: utm || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    return new Response(
      JSON.stringify({ pixCode, transactionId, status: status || "PENDING" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-pix-charge error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
