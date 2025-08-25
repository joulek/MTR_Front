import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids") || "";
  const token = cookies().get("token")?.value || "";

  const headers: Record<string,string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const upstream = await fetch(
      `${BACKEND}/api/order/client/status?ids=${encodeURIComponent(ids)}`,
      { headers }
    );
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ success:false, message:"Proxy error" }, { status: 502 });
  }
}
