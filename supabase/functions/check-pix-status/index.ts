import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "transactionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const DUTTYFY_URL = Deno.env.get("DUTTYFY_PIX_URL_ENCRYPTED");
    if (!DUTTYFY_URL || !DUTTYFY_URL.startsWith("https://")) {
      throw new Error("DUTTYFY_PIX_URL_ENCRYPTED not configured or invalid");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${DUTTYFY_URL}?transactionId=${encodeURIComponent(transactionId)}`,
      { method: "GET", signal: controller.signal }
    );

    clearTimeout(timeout);

    const data = await response.json();

    // If completed, update DB
    if (data.status === "COMPLETED") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabase
        .from("pix_transactions")
        .update({
          status: "COMPLETED",
          paid_at: data.paidAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", transactionId);
    }

    return new Response(
      JSON.stringify({ status: data.status, paidAt: data.paidAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-pix-status error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
