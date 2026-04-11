import { NextResponse } from "next/server";

import { buildGraph } from "@/lib/content";

// Force static generation — no serverless function needed
export const dynamic = "force-static";

export async function GET() {
  const graph = await buildGraph();
  return NextResponse.json(graph);
}
