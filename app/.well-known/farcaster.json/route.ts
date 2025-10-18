import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjEzNzk1NDUsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg0ZGIwRmNjNTc5YkUwMDcxNmI4M2FjNDA4NTA0ODc3YTNiMjJmNmUzIn0",
      payload: "eyJkb21haW4iOiJsZWFndWUuc2VlcnNodWIuY29tIn0",
      signature: "pAp2aFOxDH9FSC+2WJmg/3i9ggjzmmnNJia1SLSuw5dgoKbHgZF7l8wf4x6SfPCPo5INcaW3l6Ninp+Bio1Nihs="
    },
    baseBuilder: {
      allowedAddresses: [""] // Add your Base Account address here
    },
    miniapp: {
      version: "1",
      name: "SeersLeague",
      homeUrl: "https://league.seershub.com",
      iconUrl: "https://league.seershub.com/icon-512.png",
      splashImageUrl: "https://league.seershub.com/splash.png",
      splashBackgroundColor: "#0052FF",
      webhookUrl: "https://league.seershub.com/api/webhook",
      subtitle: "Daily Football Predictions",
      description: "Predict 5 matches daily. First day FREE, then $1 USDC. Compete for prizes based on accuracy.",
      screenshotUrls: [
        "https://league.seershub.com/screenshots/home.png",
        "https://league.seershub.com/screenshots/leaderboard.png"
      ],
      primaryCategory: "sports",
      tags: ["sports", "predictions", "competition", "base", "daily"],
      heroImageUrl: "https://league.seershub.com/hero.png",
      tagline: "Predict, Compete, Win",
      ogTitle: "SeersLeague - Daily Football Predictions on Base",
      ogDescription: "First day free! Predict 5 matches daily, compete for prizes. Build your on-chain reputation.",
      ogImageUrl: "https://league.seershub.com/og-image.png",
      noindex: false
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}