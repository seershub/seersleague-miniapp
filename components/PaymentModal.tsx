'use client';

import { useState } from 'react';
// import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { USDC_ABI, CONTRACTS, formatUSDC } from '@/lib/contract-interactions';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  amount: bigint;
}

export function PaymentModal({ onSuccess, onCancel, amount }: PaymentModalProps) {
  // const { address } = useAccount();
  const address = null; // Placeholder for now
  const [step, setStep] = useState<'approve' | 'confirm'>('approve');
  const [isApproving, setIsApproving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Check USDC balance - placeholder for now
  const balance = BigInt(10000000000); // 10 USDC placeholder
  
  // Check current allowance - placeholder for now
  const allowance = BigInt(0); // No allowance placeholder
  
  // const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  // const { isLoading: isApprovePending } = useWaitForTransactionReceipt({ hash: approveHash });
  const isApprovePending = false;
  
  // const { writeContract: writeConfirm, data: confirmHash } = useWriteContract();
  // const { isLoading: isConfirmPending } = useWaitForTransactionReceipt({ hash: confirmHash });
  const isConfirmPending = false;
  
  const hasEnoughBalance = balance && balance >= amount;
  const hasEnoughAllowance = allowance && allowance >= amount;
  
  const handleApprove = async () => {
    try {
      setIsApproving(true);
      
      // Placeholder for now - will be implemented with Farcaster Mini App SDK
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('USDC approval successful!');
      
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
  if (isApprovePending && step === 'approve') {
    setStep('confirm');
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
        <h3 className="text-xl font-bold mb-4">Payment Confirmation</h3>
        
        {/* Balance Check */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your USDC Balance:</span>
            <span className="font-semibold">
              {balance ? formatUSDC(balance) : '...'} USDC
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
            
            <button
              onClick={handleApprove}
              disabled={!hasEnoughBalance || isApproving || isApprovePending}
              className="btn-primary w-full py-3"
            >
              {isApproving || isApprovePending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner"></div>
                  <span>Approving...</span>
                </div>
              ) : (
                'Approve USDC'
              )}
            </button>
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
            
            <button
              onClick={handleConfirm}
              disabled={isConfirming || isConfirmPending}
              className="btn-primary w-full py-3"
            >
              {isConfirming || isConfirmPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner"></div>
                  <span>Confirming...</span>
                </div>
              ) : (
                'Confirm & Submit Predictions'
              )}
            </button>
          </div>
        )}
        
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          disabled={isApproving || isConfirming || isApprovePending || isConfirmPending}
          className="btn-secondary w-full mt-3 py-2"
        >
          Cancel
        </button>
        
        {/* Security Notice */}
        <p className="text-xs text-gray-500 text-center mt-4">
          🔒 Your payment is secure and processed on Base blockchain
        </p>
      </div>
    </div>
  );
}
