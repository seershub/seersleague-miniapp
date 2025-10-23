'use client';

import { useEffect, useState } from 'react';
// import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { USDC_ABI, CONTRACTS, formatUSDC } from '@/lib/contract-interactions';
import { encodeFunctionData } from 'viem';
import { publicClient } from '@/lib/viem-config';
import { useMiniKit } from './MiniKitProvider';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  amount: bigint;
}

export function PaymentModal({ onSuccess, onCancel, amount }: PaymentModalProps) {
  // const { address } = useAccount();
  const { isReady, sdk } = useMiniKit();
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [step, setStep] = useState<'approve' | 'confirm'>('approve');
  const [isApproving, setIsApproving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  
  useEffect(() => {
    const init = async () => {
      try {
        if (!isReady || !sdk) return;
        const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0] as `0x${string}`);
        }
      } catch {}
    };
    init();
  }, [isReady, sdk]);

  useEffect(() => {
    const load = async () => {
      if (!address) return;
      try {
        // Direct blockchain calls - works with Alchemy API key
        const [bal, alw] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.USDC,
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [address]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: CONTRACTS.USDC,
            abi: USDC_ABI,
            functionName: 'allowance',
            args: [address, CONTRACTS.SEERSLEAGUE]
          }) as Promise<bigint>,
        ]);
        setBalance(bal);
        setAllowance(alw);
      } catch (e) {
        console.error('Failed to load USDC data', e);
        // Set defaults on error
        setBalance(BigInt(0));
        setAllowance(BigInt(0));
      }
    };
    load();
  }, [address]);
  
  // const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  // const { isLoading: isApprovePending } = useWaitForTransactionReceipt({ hash: approveHash });
  const isApprovePending = false;
  
  // const { writeContract: writeConfirm, data: confirmHash } = useWriteContract();
  // const { isLoading: isConfirmPending } = useWaitForTransactionReceipt({ hash: confirmHash });
  const isConfirmPending = false;
  
  const hasEnoughBalance = balance !== null && balance >= amount;
  const hasEnoughAllowance = allowance !== null && allowance >= amount;
  
  const handleApprove = async () => {
    try {
      setIsApproving(true);
      if (!sdk || !address) throw new Error('Wallet not connected');
      
      // Use Farcaster Mini App SDK's wallet methods
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.SEERSLEAGUE, amount]
      });
      
      // Use SDK's wallet.sendTransaction method instead of eth_sendTransaction
      const txHash = await sdk.wallet.sendTransaction({
        to: CONTRACTS.USDC,
        data,
        value: '0x0'
      });
      
      console.log('Approval transaction sent:', txHash);
      toast.success('USDC approval transaction sent!');
      
      // Wait for transaction to be mined (simplified approach)
      await new Promise(r => setTimeout(r, 3000));
      
      // Check allowance once
      try {
        const newAllowance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [address, CONTRACTS.SEERSLEAGUE]
        }) as bigint;
        
        setAllowance(newAllowance);
        
        if (newAllowance >= amount) {
          console.log('Allowance confirmed:', newAllowance.toString());
          setStep('confirm');
        } else {
          toast.info('Approval is processing. Please wait a moment and try again.');
        }
      } catch (error) {
        console.log('Could not check allowance:', error);
        toast.info('Approval sent. Please wait a moment and try again.');
      }
      
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error('Failed to approve USDC. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };
  
  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      
      // The actual prediction submission will be handled by the parent component
      onSuccess();
      
    } catch (error: any) {
      console.error('Confirmation error:', error);
      toast.error('Failed to confirm payment. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };
  
  // Auto-advance to confirm step when approval is complete
  useEffect(() => {
    if (hasEnoughAllowance && step === 'approve') {
      setStep('confirm');
    }
  }, [hasEnoughAllowance, step]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
        <h3 className="text-xl font-bold mb-4">Payment Confirmation</h3>
        
        {/* Balance Check */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your USDC Balance:</span>
            <span className="font-semibold">
              {balance !== null ? formatUSDC(balance) : '...'} USDC
            </span>
          </div>
          {!hasEnoughBalance && (
            <p className="text-red-400 text-sm mt-1">
              Insufficient balance. You need at least {formatUSDC(amount)} USDC.
            </p>
          )}
        </div>
        
        {/* Payment Details */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Entry Fee:</span>
            <span className="font-semibold">{formatUSDC(amount)} USDC</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Network:</span>
            <span className="font-semibold">Base</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total:</span>
            <span className="font-semibold text-base-blue">{formatUSDC(amount)} USDC</span>
          </div>
        </div>
        
        {/* Steps */}
        {step === 'approve' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🔐</div>
              <h4 className="font-semibold mb-2">Approve USDC Spending</h4>
              <p className="text-sm text-gray-400">
                Allow SeersLeague to spend {formatUSDC(amount)} USDC from your wallet.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleApprove}
                disabled={!hasEnoughBalance || isApproving || isApprovePending || !address}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving || isApprovePending ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="spinner"></div>
                    <span>Approving...</span>
                  </div>
                ) : (
                  'APPROVE USDC'
                )}
              </button>
              
              <button
                onClick={onCancel}
                disabled={isApproving || isApprovePending}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold mb-2">Ready to Submit</h4>
              <p className="text-sm text-gray-400">
                Your USDC is approved. Ready to submit your predictions?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleConfirm}
                disabled={isConfirming || isConfirmPending}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming || isConfirmPending ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="spinner"></div>
                    <span>Confirming...</span>
                  </div>
                ) : (
                  'CONFIRM & SUBMIT'
                )}
              </button>
              
              <button
                onClick={onCancel}
                disabled={isConfirming || isConfirmPending}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        
        {/* Security Notice */}
        <p className="text-xs text-gray-500 text-center mt-4">
          🔒 Your payment is secure and processed on Base blockchain
        </p>
      </div>
    </div>
  );
}
