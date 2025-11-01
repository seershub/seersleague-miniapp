'use client';

import { useEffect, useState } from 'react';
import { Vault as VaultIcon, TrendingUp, Activity, ExternalLink, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface VaultBalance {
  balance: number;
  formatted: string;
  symbol: string;
}

interface ActivityItem {
  id: string;
  user: {
    address: string;
    maskedAddress: string;
    ensName: string | null;
    avatar: string;
  };
  action: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

export default function VaultPage() {
  const [balance, setBalance] = useState<VaultBalance | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const VAULT_ADDRESS = '0x2cab9667c6e3ab9549c128c9f50f5103c627a575';
  const VAULT_ENS = 'seershub.base.eth';

  useEffect(() => {
    fetchVaultData();
    const interval = setInterval(fetchVaultData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchVaultData = async () => {
    try {
      // Fetch balance and activity in parallel
      const [balanceRes, activityRes] = await Promise.all([
        fetch('/api/vault/balance'),
        fetch('/api/vault/activity')
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.usdc);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.activity);
      }
    } catch (error) {
      console.error('Error fetching vault data:', error);
      toast.error('Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(VAULT_ADDRESS);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full mb-4 border border-yellow-400/20">
            <VaultIcon className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Treasury Vault</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
            SeersLeague Vault
          </h1>
          <p className="text-gray-400">
            All prediction fees are collected here
          </p>
        </div>

        {/* Vault Balance Card */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-400/20 p-8">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent animate-pulse" />

            <div className="relative z-10">
              {/* USDC Logo and Balance */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
                    <Image
                      src="https://www.seershub.com/usdc-logo.png"
                      alt="USDC"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Balance</p>
                    {loading ? (
                      <div className="h-10 w-32 bg-gray-800 animate-pulse rounded" />
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white">
                          {balance?.balance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                        <span className="text-xl text-gray-400">USDC</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trending Icon */}
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Growing</span>
                </div>
              </div>

              {/* Vault Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/10">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Vault Address</p>
                    <p className="font-mono text-sm text-white">{VAULT_ENS}</p>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <a
                  href={`https://basescan.org/address/${VAULT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-blue-400 text-sm font-medium"
                >
                  <span>View on BaseScan</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold">Recent Activity</h2>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-900/50 animate-pulse rounded-xl" />
              ))
            ) : activity.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {activity.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-900/50 to-transparent border border-gray-800 hover:border-gray-700 transition-all animate-fadeIn"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-700 flex-shrink-0">
                      <Image
                        src={item.user.avatar}
                        alt="User"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>

                    {/* Activity Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {item.user.ensName || item.user.maskedAddress}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {item.action.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{item.amount}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>

                    {/* Amount Badge */}
                    <div className="hidden sm:block px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                      <span className="text-sm font-medium text-yellow-400">
                        {item.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
