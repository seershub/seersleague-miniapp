import type { MiniAppManifest } from '@coinbase/onchainkit/minikit';

const ROOT_URL = process.env.NEXT_PUBLIC_URL || 'https://league.seershub.com';

export const miniappManifest: MiniAppManifest = {
  accountAssociation: {
    // Generated via https://www.base.org/build
    // After deployment, paste values here
    header: process.env.NEXT_PUBLIC_ACCOUNT_ASSOCIATION_HEADER || "",
    payload: process.env.LB_PUBLIC_ACCOUNT_ASSOCIATION_PAYLOAD || "",
    signature: process.env.LB_PUBLIC_ACCOUNT_ASSOCIATION_SIGNATURE || ""
  },
  frame: {
    version: "next",
    imageUrl: `${ROOT_URL}/og-image.png`,
    button: {
      title: "Launch SeersLeague",
      action: {
        type: "launch_frame",
        name: "SeersLeague",
        url: ROOT_URL,
        splashImageUrl: `${ROOT_URL}/splash.png`,
        splashBackgroundColor: "#0052FF"
      }
    }
  },
  miniapp: {
    version: "1",
    name: "SeersLeague",
    subtitle: "Daily Football Predictions",
    description: "Predict 5 matches daily. First day free, then $1 USDC per day. Compete for prizes based on accuracy. Build your on-chain reputation.",
    
    iconUrl: `${ROOT_URL}/icon-512.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#0052FF",
    
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    
    screenshotUrls: [
      `${ROOT_URL}/screenshots/home.png`,
      `${ROOT_URL}/screenshots/leaderboard.png`
    ],
    
    primaryCategory: "social",
    tags: ["sports", "predictions", "competition", "base", "daily"],
    
    heroImageUrl: `${ROOT_URL}/hero.png`,
    
    ogTitle: "SeersLeague - Daily Football Predictions on Base",
    ogDescription: "First day free! Predict 5 matches daily, compete for prizes. Build your on-chain prediction reputation.",
    ogImageUrl: `${ROOT_URL}/og-image.png`
  }
};
