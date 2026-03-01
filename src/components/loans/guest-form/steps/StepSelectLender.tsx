'use client';

import React from 'react';
import { ChevronLeft, ChevronDown, Check, Search, X, Zap, AtSign, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { getLoanTypeIcon } from '../types';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'lenderType'
  | 'setStep'
  | 'setStepError'
  | 'loanTypes'
  | 'selectedLoanTypeId'
  | 'setSelectedLoanTypeId'
  | 'loanTypeSearch'
  | 'setLoanTypeSearch'
  | 'showLoanTypeDropdown'
  | 'setShowLoanTypeDropdown'
  | 'setValue'
  | 'register'
  | 'usernameSearch'
  | 'setUsernameSearch'
  | 'usernameSearching'
  | 'usernameFound'
  | 'usernameError'
  | 'searchUsername'
  | 'canProceedStep2'
  | 'goToNextStep'
>;

export function StepSelectLender({
  lenderType,
  setStep,
  setStepError,
  loanTypes,
  selectedLoanTypeId,
  setSelectedLoanTypeId,
  loanTypeSearch,
  setLoanTypeSearch,
  showLoanTypeDropdown,
  setShowLoanTypeDropdown,
  setValue,
  register,
  usernameSearch,
  setUsernameSearch,
  usernameSearching,
  usernameFound,
  usernameError,
  searchUsername,
  canProceedStep2,
  goToNextStep,
}: Props) {
  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setStep(1); setStepError(null); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {lenderType === 'business' ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Auto-Match Enabled</h2>
            <p className="text-neutral-500">We'll find the best lender for you automatically</p>
          </div>

          <Card className="border border-neutral-200 dark:border-neutral-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                </div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">How It Works</h3>
              </div>
              <div className="space-y-4">
                {[
                  'You submit your loan request',
                  'We match you with available lenders',
                  'Best match funds your loan',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs text-neutral-600 dark:text-neutral-400 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {loanTypes.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                What type of loan? <span className="text-red-500">*</span>
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                Select a loan type to help us match you with the right lenders
              </p>

              <div className="relative">
                <div
                  className={`w-full px-4 py-3 rounded-xl border cursor-pointer transition ${
                    showLoanTypeDropdown ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-800`}
                  onClick={() => setShowLoanTypeDropdown(!showLoanTypeDropdown)}
                >
                  <div className="flex items-center justify-between">
                    {selectedLoanTypeId ? (() => {
                      const selectedType = loanTypes.find((lt) => lt.id === selectedLoanTypeId);
                      if (!selectedType) return null;
                      const IconComponent = getLoanTypeIcon(selectedType);
                      return (
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                          <span className="text-neutral-900 dark:text-white">{selectedType.name}</span>
                        </div>
                      );
                    })() : <span className="text-neutral-500">Select loan purpose...</span>}
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showLoanTypeDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {showLoanTypeDropdown && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg">
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="text"
                          value={loanTypeSearch}
                          onChange={(e) => setLoanTypeSearch(e.target.value)}
                          placeholder="Search loan types..."
                          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      {loanTypes
                        .filter((lt) =>
                          loanTypeSearch === '' ||
                          lt.name.toLowerCase().includes(loanTypeSearch.toLowerCase()) ||
                          lt.description?.toLowerCase().includes(loanTypeSearch.toLowerCase()),
                        )
                        .map((lt) => {
                          const IconComponent = getLoanTypeIcon(lt);
                          return (
                            <button
                              key={lt.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLoanTypeId(lt.id);
                                setValue('loanTypeId', lt.id);
                                setShowLoanTypeDropdown(false);
                                setLoanTypeSearch('');
                              }}
                              className={`w-full px-3 py-2.5 rounded-lg text-left transition flex items-center gap-3 ${
                                selectedLoanTypeId === lt.id
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                              }`}
                            >
                              <IconComponent className={`w-5 h-5 flex-shrink-0 ${selectedLoanTypeId === lt.id ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{lt.name}</p>
                                {lt.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{lt.description}</p>}
                              </div>
                              {selectedLoanTypeId === lt.id && <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      {loanTypes.filter((lt) =>
                        loanTypeSearch === '' || lt.name.toLowerCase().includes(loanTypeSearch.toLowerCase()),
                      ).length === 0 && (
                        <p className="px-3 py-4 text-sm text-neutral-500 text-center">No matching loan types</p>
                      )}
                    </div>
                  </div>
                )}

                {showLoanTypeDropdown && (
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => { setShowLoanTypeDropdown(false); setLoanTypeSearch(''); }}
                  />
                )}
              </div>

              {selectedLoanTypeId && (
                <button
                  type="button"
                  onClick={() => { setSelectedLoanTypeId(null); setValue('loanTypeId', ''); }}
                  className="mt-2 text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear selection
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Invite Your Lender</h2>
            <p className="text-neutral-500">Find them by username or enter their contact info</p>
          </div>

          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
            <label className="block text-sm font-medium mb-2">
              <AtSign className="w-4 h-4 inline mr-1" /> Feyza Username
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 font-medium">~</span>
                <input
                  type="text"
                  value={usernameSearch}
                  onChange={(e) => { setUsernameSearch(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchUsername(usernameSearch); } }}
                  placeholder="username"
                  className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:border-neutral-700"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => searchUsername(usernameSearch)}
                disabled={usernameSearching || !usernameSearch}
              >
                {usernameSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {usernameFound && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">~{usernameFound.username}</p>
                  <p className="text-sm text-green-700">{usernameFound.displayName}</p>
                </div>
              </div>
            )}
            {usernameError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">{usernameError}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-sm text-neutral-400">or invite by contact</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="friend@example.com"
            {...register('inviteEmail')}
            onChange={(e) => { setValue('inviteEmail', e.target.value); setStepError(null); }}
          />
        </>
      )}

      <div className="pt-2 pb-1">
        <Button
          type="button"
          onClick={() => goToNextStep(3)}
          disabled={!canProceedStep2()}
          className="w-full rounded-2xl py-3 text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
