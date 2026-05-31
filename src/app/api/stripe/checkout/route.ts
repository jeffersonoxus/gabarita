import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "Stripe não configurado. Adicione STRIPE_SECRET_KEY e STRIPE_PRICE_ID no .env.local"
  }, { status: 501 });
}
