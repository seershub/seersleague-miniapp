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
    const interval = setInterval(fetchVaultData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVaultData = async () => {
    try {
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

        {/* Page Header */}
        <div className="text-center mb-6 animate-fade-up">
          <div className="badge-gold mb-4 inline-flex">
            <VaultIcon className="w-4 h-4" />
            <span>Treasury Vault</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-gold-text">SeersLeague Vault</span>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            All prediction fees are collected here
          </p>
        </div>

        {/* Vault Balance Card */}
        <div className="mb-6 animate-fade-up-delay-1">
          <div className="glass-card p-6 border-[rgba(245,158,11,0.15)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center">
                  <Image
                    src="https://www.seershub.com/usdc-logo.png"
                    alt="USDC"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs text-[rgb(var(--text-muted))] mb-1">Total Balance</p>
                  {loading ? (
                    <div className="h-8 w-24 bg-[rgba(55,55,65,0.5)] animate-pulse rounded" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">
                        {balance?.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                      <span className="text-base text-[rgb(var(--text-muted))]">USDC</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden sm:flex badge-green">
                <TrendingUp className="w-4 h-4" />
                <span>Growing</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(17,17,21,0.6)] border border-[rgba(255,255,255,0.04)]">
                <div>
                  <p className="text-[10px] text-[rgb(var(--text-muted))] mb-0.5">Vault Address</p>
                  <p className="font-mono text-sm text-white">{VAULT_ENS}</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="p-2 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[rgb(var(--brand-green))]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                  )}
                </button>
              </div>

              <a
                href={`https://basescan.org/address/${VAULT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[rgba(0,245,255,0.05)] border border-[rgba(0,245,255,0.15)] hover:bg-[rgba(0,245,255,0.08)] transition-colors text-[rgb(var(--brand-cyan))] text-sm font-medium"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-up-delay-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[rgb(var(--text-muted))]" />
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          </div>

          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 bg-[rgba(55,55,65,0.3)] animate-pulse rounded-xl" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-10 h-10 text-[rgb(var(--text-muted))] mx-auto mb-3 opacity-50" />
                <p className="text-[rgb(var(--text-muted))]">No recent activity</p>
              </div>
            ) : (
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {activity.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(24,24,30,0.5)] border border-[rgba(255,255,255,0.03)] hover:bg-[rgba(32,32,40,0.6)] transition-colors animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)] flex-shrink-0">
                      <Image
                        src={item.user.avatar}
                        alt="User"
                        width={36}
                        height={36}
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-medium text-white text-sm truncate">
                          {item.user.ensName || item.user.maskedAddress}
                        </span>
                        <span className="text-[rgb(var(--text-muted))] text-xs">
                          {item.action.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                        <span>{item.amount}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>

                    <div className="hidden sm:block badge-gold text-xs">
                      {item.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
