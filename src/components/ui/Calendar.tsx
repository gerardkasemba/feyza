'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void; // Allow null to clear selection
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean; // Change from boolean | null to just boolean
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  className = '',
  placeholder = 'Select a date',
  label,
  error,
  disabled, // ✅ Default is false (boolean)
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => selectedDate || new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const isDisabled = disabled ?? false;

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll on mobile when calendar is open
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Normalize date to start of day for comparison
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Today's date (normalized)
  const today = useMemo(() => normalizeDate(new Date()), []);

  // Normalized min/max dates - default minDate to today if not provided
  const normalizedMinDate = useMemo(() => {
    const min = minDate || new Date();
    return normalizeDate(min);
  }, [minDate]);
  const normalizedMaxDate = useMemo(() => maxDate ? normalizeDate(maxDate) : null, [maxDate]);
  const normalizedSelectedDate = useMemo(() => selectedDate ? normalizeDate(selectedDate) : null, [selectedDate]);

  // Get days in month - FIXED: Properly calculate days
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Get previous month's trailing days
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    for (let i = firstDayOfWeek; i > 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i + 1);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }
    
    // Get current month's days
    const daysInCurrentMonth = lastDay.getDate();
    
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const date = new Date(year, month, i);
      const normalizedDate = normalizeDate(date);
      
      const isBeforeMin = normalizedDate < normalizedMinDate;
      const isAfterMax = normalizedMaxDate && normalizedDate > normalizedMaxDate;
      const isDisabled = isBeforeMin || isAfterMax;
      const isToday = normalizedDate.getTime() === today.getTime();
      const isSelected = normalizedSelectedDate && normalizedDate.getTime() === normalizedSelectedDate.getTime();
      
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled,
        isToday,
        isSelected,
      });
    }
    
    // Fill remaining cells to complete 6 weeks (42 cells)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }
    
    return days;
  }, [currentMonth, normalizedSelectedDate, normalizedMinDate, normalizedMaxDate, today]);

  // Generate months for year view
  const months = useMemo(() => {
    const year = currentMonth.getFullYear();
    return Array.from({ length: 12 }, (_, i) => ({
      name: new Date(year, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      date: new Date(year, i, 1),
      isCurrent: i === currentMonth.getMonth(),
    }));
  }, [currentMonth]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
  };

  const handleNextYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
  };

  const handleMonthSelect = (date: Date) => {
    setCurrentMonth(date);
    setViewMode('month');
  };

  // FIXED: Proper date selection with normalization
  const handleDateSelect = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    
    const isBeforeMin = normalizedDate < normalizedMinDate;
    const isAfterMax = normalizedMaxDate && normalizedDate > normalizedMaxDate;
    
    if (!isBeforeMin && !isAfterMax) {
      onDateSelect(date);
      setIsOpen(false);
    }
  };

  const handleTodayClick = () => {
    const todayDate = new Date();
    const normalizedToday = normalizeDate(todayDate);
    
    const isBeforeMin = normalizedToday < normalizedMinDate;
    const isAfterMax = normalizedMaxDate && normalizedToday > normalizedMaxDate;
    
    if (!isBeforeMin && !isAfterMax) {
      onDateSelect(todayDate);
      setCurrentMonth(todayDate);
      setIsOpen(false);
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className={`relative ${className}`} ref={calendarRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}

      {/* Date Toggle Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3 
          border rounded-xl text-left transition-colors
          ${disabled 
            ? 'bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-60'
            : selectedDate 
              ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
          }
          ${error ? 'border-red-500 dark:border-red-400' : ''}
          text-neutral-900 dark:text-white
        `}
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          <span className={selectedDate ? 'font-medium' : 'text-neutral-500 dark:text-neutral-400'}>
            {formatDisplayDate(selectedDate)}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Calendar Popup */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          {isMobile && (
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
          )}
          
          <div className={`
            ${isMobile 
              ? 'fixed inset-x-4 bottom-4 z-50 max-h-[80vh] overflow-auto' 
              : 'absolute z-50 mt-2 w-full max-w-sm'
            }
            bg-white dark:bg-neutral-800 rounded-xl border 
            border-neutral-200 dark:border-neutral-700 shadow-xl
          `}>
            {/* Mobile Header */}
            {isMobile && (
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-800">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Select Date
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <div className="p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={viewMode === 'year' ? handlePrevYear : handlePrevMonth}
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    aria-label={viewMode === 'year' ? 'Previous year' : 'Previous month'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
                    className="px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors min-w-[140px]"
                  >
                    {viewMode === 'month' 
                      ? currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : currentMonth.getFullYear()
                    }
                  </button>
                  
                  <button
                    onClick={viewMode === 'year' ? handleNextYear : handleNextMonth}
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    aria-label={viewMode === 'year' ? 'Next year' : 'Next month'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                <button
                  onClick={handleTodayClick}
                  className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  Today
                </button>
              </div>

              {/* Year View */}
              {viewMode === 'year' && (
                <div className="grid grid-cols-4 gap-2">
                  {months.map((month) => (
                    <button
                      key={month.name}
                      onClick={() => handleMonthSelect(month.date)}
                      className={`py-3 text-sm rounded-lg transition-colors ${
                        month.isCurrent
                          ? 'bg-primary-600 dark:bg-primary-500 text-white'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {month.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Month View */}
              {viewMode === 'month' && (
                <>
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {daysInMonth.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => !day.isDisabled && handleDateSelect(day.date)}
                      disabled={!!day.isDisabled}
                      className={`
                        aspect-square rounded-lg text-sm flex items-center justify-center transition-all
                        ${day.isSelected
                          ? 'bg-primary-500 dark:bg-primary-600 text-white font-semibold'
                          : day.isToday && !day.isSelected
                          ? 'ring-2 ring-primary-500 dark:ring-primary-400 text-primary-600 dark:text-primary-400 font-semibold'
                          : day.isCurrentMonth
                          ? 'text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          : 'text-neutral-300 dark:text-neutral-600'
                        }
                        ${day.isDisabled
                          ? 'opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                          : 'cursor-pointer active:scale-95'
                        }
                      `}
                    >
                      {day.date.getDate()}
                    </button>

                    ))}
                  </div>
                </>
              )}

              {/* Selected Date Display */}
              {selectedDate && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Selected date:
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Action Buttons */}
            {isMobile && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 sticky bottom-0 bg-white dark:bg-neutral-800">
                <div className="flex gap-3">
                  {selectedDate && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Note: caller needs to handle null case
                        onDateSelect(null as any);
                      }}
                      className="flex-1"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="date"
        value={formatDateForInput(selectedDate)}
        readOnly
      />
    </div>
  );
}

// Also export a simpler inline date picker with quick options
export function DatePickerInline({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
}: {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const today = useMemo(() => normalizeDate(new Date()), []);
  const normalizedMinDate = useMemo(() => minDate ? normalizeDate(minDate) : today, [minDate, today]);
  const normalizedMaxDate = useMemo(() => maxDate ? normalizeDate(maxDate) : null, [maxDate]);

  // Quick date options
  const quickDates = useMemo(() => {
    const options = [];
    const addDays = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

    const dates = [
      { label: 'Today', date: new Date() },
      { label: 'Tomorrow', date: addDays(1) },
      { label: 'In 1 week', date: addDays(7) },
      { label: 'In 2 weeks', date: addDays(14) },
      { label: 'In 1 month', date: addDays(30) },
    ];

    for (const item of dates) {
      const normalized = normalizeDate(item.date);
      const isValid = normalized >= normalizedMinDate && 
                      (!normalizedMaxDate || normalized <= normalizedMaxDate);
      if (isValid) {
        options.push(item);
      }
    }

    return options;
  }, [normalizedMinDate, normalizedMaxDate]);

  return (
    <div className="flex flex-wrap gap-2">
      {quickDates.map((item) => {
        const isSelected = selectedDate && 
          normalizeDate(item.date).getTime() === normalizeDate(selectedDate).getTime();
        
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onDateSelect(item.date)}
            className={`
              px-3 py-1.5 text-sm rounded-lg border transition-colors
              ${isSelected
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 text-neutral-700 dark:text-neutral-300'
              }
            `}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
