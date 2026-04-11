import { NextResponse } from "next/server";

import { buildGraph } from "@/lib/content";

export async function GET() {
  const graph = await buildGraph();
  return NextResponse.json(graph);
}
