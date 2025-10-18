import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: "", // Will generate at base.org/build after deployment
      payload: "",
      signature: ""
    },
    frame: {
      version: "next",
      imageUrl: "https://league.seershub.com/og-image.png",
      button: {
        title: "Launch SeersLeague",
        action: {
          type: "launch_frame",
          name: "SeersLeague",
          url: "https://league.seershub.com",
          splashImageUrl: "https://league.seershub.com/splash.png",
          splashBackgroundColor: "#0052FF"
        }
      }
    },
    miniapp: {
      version: "1",
      name: "SeersLeague",
      subtitle: "Daily Football Predictions",
      description: "Predict 5 matches daily. First day FREE, then $1 USDC. Compete for prizes based on accuracy.",
      
      iconUrl: "https://league.seershub.com/icon-512.png",
      splashImageUrl: "https://league.seershub.com/splash.png",
      splashBackgroundColor: "#0052FF",
      
      homeUrl: "https://league.seershub.com",
      
      screenshotUrls: [
        "https://league.seershub.com/screenshots/home.png",
        "https://league.seershub.com/screenshots/leaderboard.png"
      ],
      
      primaryCategory: "social",
      tags: ["sports", "predictions", "competition", "base", "daily"],
      
      heroImageUrl: "https://league.seershub.com/hero.png",
      
      ogTitle: "SeersLeague - Daily Football Predictions on Base",
      ogDescription: "First day free! Predict 5 matches daily, compete for prizes. Build your on-chain reputation.",
      ogImageUrl: "https://league.seershub.com/og-image.png"
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