import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which commit is this deployment running? (Vercel injects the SHA.) */
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local-dev",
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID ? undefined : new Date().toISOString(),
  });
}
