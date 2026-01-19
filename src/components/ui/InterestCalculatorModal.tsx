'use client';

import React, { useState, useEffect } from 'react';
import { X, Calculator, DollarSign, Percent, ArrowRight } from 'lucide-react';

interface InterestCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRate?: (rate: number) => void;
}

export function InterestCalculatorModal({ isOpen, onClose, onSelectRate }: InterestCalculatorModalProps) {
  const [principal, setPrincipal] = useState('');
  const [totalReturn, setTotalReturn] = useState('');
  const [calculatedRate, setCalculatedRate] = useState<number | null>(null);

  // Calculate interest rate when inputs change
  useEffect(() => {
    const principalNum = parseFloat(principal);
    const totalReturnNum = parseFloat(totalReturn);

    if (principalNum > 0 && totalReturnNum > 0) {
      if (totalReturnNum < principalNum) {
        setCalculatedRate(null);
      } else {
        const rate = ((totalReturnNum - principalNum) / principalNum) * 100;
        setCalculatedRate(Math.round(rate * 100) / 100);
      }
    } else {
      setCalculatedRate(null);
    }
  }, [principal, totalReturn]);

  const handleUseRate = () => {
    if (calculatedRate !== null && onSelectRate) {
      onSelectRate(calculatedRate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Interest Rate Calculator</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Calculate your interest rate based on how much you want to earn back.
          </p>

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                How much will you lend?
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="1000"
                  className="w-full pl-10 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                How much do you want back (total)?
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="number"
                  value={totalReturn}
                  onChange={(e) => setTotalReturn(e.target.value)}
                  placeholder="1200"
                  className="w-full pl-10 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Result */}
          {calculatedRate !== null && (
            <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-primary-700 dark:text-primary-400">Your Interest Rate:</span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{calculatedRate}%</span>
              </div>
              <div className="text-xs text-primary-600 dark:text-primary-400 space-y-1">
                <div className="flex items-center gap-2">
                  <span>Principal:</span>
                  <span className="font-medium">${parseFloat(principal).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Interest earned:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +${(parseFloat(totalReturn) - parseFloat(principal)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {parseFloat(totalReturn) > 0 && parseFloat(totalReturn) < parseFloat(principal) && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Total return should be greater than the loan amount to earn interest.
              </p>
            </div>
          )}

          {/* Example */}
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">💡 Example:</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              If you lend <strong className="text-neutral-900 dark:text-white">$1,000</strong> and want to receive <strong className="text-neutral-900 dark:text-white">$1,200</strong> back, 
              your interest rate would be <strong className="text-primary-600 dark:text-primary-400">20%</strong>.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
              Formula: ((Total Return - Principal) ÷ Principal) × 100
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            {onSelectRate && (
              <button
                onClick={handleUseRate}
                disabled={calculatedRate === null}
                className="flex-1 px-4 py-3 bg-primary-500 dark:bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-600 dark:hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Use {calculatedRate !== null ? `${calculatedRate}%` : 'Rate'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}