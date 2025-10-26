"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, CircleUserRound, Target, Trophy, Gift } from "lucide-react";

// Modalın kaç adımdan oluşacağını belirle
const TOTAL_STEPS = 4;

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [storageKey] = useState("seersLeague_hasSeenOnboarding_v1");

  // 1. Sayfa yüklendiğinde localStorage'ı kontrol et
  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, [storageKey]);

  // 2. Modalı kapatma ve "Görüldü" olarak işaretleme fonksiyonu
  const handleClose = () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  // 3. Modal açık değilse hiçbir şey render etme
  if (!isOpen) {
    return null;
  }

  // 4. Render edilecek içeriği adıma göre belirle
  let stepContent;
  switch (step) {
    case 1:
      stepContent = (
        <StepContent
          icon={<CircleUserRound size={48} className="text-blue-400" />}
          title="Welcome to SeersLeague!"
          text="The on-chain, skill-based football prediction league built on Base, right inside Farcaster."
        />
      );
      break;
    case 2:
      stepContent = (
        <StepContent
          icon={<Target size={48} className="text-blue-400" />}
          title="1. Make Your Picks"
          text="Select your predictions (Home, Draw, or Away) for the daily matches shown on the home screen."
        />
      );
      break;
    case 3:
      stepContent = (
        <StepContent
          icon={<Trophy size={48} className="text-blue-400" />}
          title="2. Climb the League"
          text="Submit your picks on-chain. Compete on the leaderboard to prove your skill and win USDC rewards."
        />
      );
      break;
    case 4:
      stepContent = (
        <StepContent
          icon={<Gift size={48} className="text-yellow-400" />}
          title="Your First 5 are FREE!"
          text="To get you started, your first five (5) predictions are on us. Good luck, Seer!"
        />
      );
      break;
    default:
      stepContent = null;
  }

  // 5. Modalın ana JSX yapısı
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-xl">
        
        {/* Kapatma Butonu */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        {/* Adım İçeriği */}
        <div className="flex flex-col items-center text-center">
          {stepContent}
        </div>

        {/* Alt Navigasyon */}
        <div className="mt-6 flex items-center justify-between">
          {/* Adım Göstergesi (Örn: 2 / 4) */}
          <span className="text-sm text-gray-500">
            {step} / {TOTAL_STEPS}
          </span>
          
          <div className="flex gap-4">
            {/* "Atla" Butonu */}
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 transition-colors hover:text-white"
            >
              Skip
            </button>
            
            {/* "İleri" veya "Bitir" Butonu */}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
              >
                Let's Go!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Adım içeriğini render etmek için yardımcı component
function StepContent({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) {
  return (
    <>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700">
        {icon}
      </div>
      <h2 className="mt-4 text-2xl font-bold text-white">
        {title}
      </h2>
      <p className="mt-2 text-base text-gray-400">
        {text}
      </p>
    </>
  );
}

