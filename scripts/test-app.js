#!/usr/bin/env node

/**
 * Test SeersLeague application functionality
 * 
 * Usage: node scripts/test-app.js
 */

const fs = require('fs');
const path = require('path');

function testFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${filePath} - NOT FOUND`);
    return false;
  }
}

function testFileContent(filePath, description, requiredContent) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${description}: ${filePath} - NOT FOUND`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(requiredContent)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${filePath} - Missing required content`);
    return false;
  }
}

function main() {
  console.log('🧪 Testing SeersLeague Application Structure...\n');
  
  let passed = 0;
  let total = 0;
  
  // Test core files
  const tests = [
    // Core application files
    ['app/page.tsx', 'Main app page', 'export default function Home'],
    ['app/layout.tsx', 'Root layout', 'export default function RootLayout'],
    ['app/providers.tsx', 'App providers', 'export function Providers'],
    
    // Components
    ['components/MatchCard.tsx', 'Match card component', 'export function MatchCard'],
    ['components/PredictionForm.tsx', 'Prediction form component', 'export function PredictionForm'],
    ['components/WalletConnect.tsx', 'Wallet connect component', 'export function WalletConnect'],
    ['components/PaymentModal.tsx', 'Payment modal component', 'export function PaymentModal'],
    ['components/ProfileStats.tsx', 'Profile stats component', 'export function ProfileStats'],
    ['components/ErrorBoundary.tsx', 'Error boundary component', 'export class ErrorBoundary'],
    
    // Library files
    ['lib/contracts/abi.ts', 'Contract ABI', 'export const SEERSLEAGUE_ABI'],
    ['lib/contract-interactions.ts', 'Contract interactions', 'export interface UserStats'],
    ['lib/matches.ts', 'Matches API integration', 'export async function getTodayMatches'],
    ['lib/utils.ts', 'Utility functions', 'export function cn'],
    
    // Configuration files
    ['minikit.config.ts', 'MiniKit configuration', 'export const miniappManifest'],
    ['wagmi.config.ts', 'Wagmi configuration', 'export const config'],
    ['next.config.js', 'Next.js configuration', 'module.exports'],
    ['tailwind.config.js', 'Tailwind configuration', 'module.exports'],
    ['tsconfig.json', 'TypeScript configuration', '"compilerOptions"'],
    
    // API routes
    ['app/api/matches/route.ts', 'Matches API route', 'export async function GET'],
    ['app/.well-known/farcaster.json/route.ts', 'Farcaster manifest route', 'export async function GET'],
    
    // Smart contract
    ['contracts/SeersLeague.sol', 'Smart contract', 'contract SeersLeague'],
    
    // Documentation
    ['README.md', 'README documentation', '# SeersLeague Mini App'],
    ['DEPLOYMENT.md', 'Deployment guide', '# SeersLeague Deployment Guide'],
    
    // Package files
    ['package.json', 'Package configuration', '"name": "seersleague-miniapp"'],
  ];
  
  // Run tests
  for (const [filePath, description, requiredContent] of tests) {
    total++;
    if (testFileContent(filePath, description, requiredContent)) {
      passed++;
    }
  }
  
  // Test public assets
  console.log('\n📁 Testing Public Assets...');
  const publicAssets = [
    ['public/manifest.json', 'Web app manifest'],
    ['public/icon-512.png', 'App icon'],
    ['public/splash.png', 'Splash screen'],
    ['public/og-image.png', 'Open Graph image'],
  ];
  
  for (const [filePath, description] of publicAssets) {
    total++;
    if (testFileExists(filePath, description)) {
      passed++;
    }
  }
  
  // Summary
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The application structure is complete.');
    console.log('\n📝 Next steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start development server: npm run dev');
    console.log('3. Deploy smart contract to Base Mainnet');
    console.log('4. Deploy frontend to Vercel');
    console.log('5. Configure Farcaster mini app manifest');
  } else {
    console.log('❌ Some tests failed. Please check the missing files.');
    process.exit(1);
  }
}

main();
