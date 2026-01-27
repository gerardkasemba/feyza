'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  minDate = new Date(),
  maxDate,
  className = '',
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [isOpen, setIsOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get days in month - FIXED: Properly calculate days
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Get previous month's trailing days
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today
    
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const date = new Date(year, month, i);
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      
      const isDisabled = normalizedDate < minDate || (maxDate && normalizedDate > maxDate);
      const isToday = normalizedDate.getTime() === today.getTime();
      const isSelected = selectedDate && normalizedDate.getTime() === selectedDate.getTime();
      
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled,
        isToday,
        isSelected,
      });
    }
    
    // Get next month's trailing days to complete 6 weeks
    const totalCells = 42; // 6 weeks * 7 days
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
  }, [currentMonth, selectedDate, minDate, maxDate]);

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

  const handleMonthSelect = (date: Date) => {
    setCurrentMonth(date);
    setViewMode('month');
  };

  // FIXED: Proper date selection
  const handleDateSelect = (date: Date) => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const normalizedMinDate = new Date(minDate);
    normalizedMinDate.setHours(0, 0, 0, 0);
    
    const normalizedMaxDate = maxDate ? new Date(maxDate) : null;
    if (normalizedMaxDate) normalizedMaxDate.setHours(0, 0, 0, 0);
    
    if (normalizedDate >= normalizedMinDate && 
        (!normalizedMaxDate || normalizedDate <= normalizedMaxDate)) {
      onDateSelect(date);
      setIsOpen(false); // Close calendar after selection
    }
  };

  // Format for display
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return 'Select a date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format for input field
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={`relative ${className}`} ref={calendarRef}>
      {/* Date Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-3 
          border rounded-xl text-left transition-colors
          ${selectedDate 
            ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
          }
          bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white
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

      {/* Calendar Popup */}
      {isOpen && (
        <div className={`
          absolute z-50 mt-2 w-full max-w-sm
          bg-white dark:bg-neutral-800 rounded-xl border 
          border-neutral-200 dark:border-neutral-700 shadow-xl
          ${window.innerWidth < 640 ? 'fixed inset-x-4 bottom-4 mx-auto' : ''}
        `}>
          {/* Mobile Header */}
          {window.innerWidth < 640 && (
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
                  className="px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  {viewMode === 'month' 
                    ? currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : currentMonth.getFullYear()
                  }
                </button>
                
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => {
                  const normalizedToday = new Date();
                  normalizedToday.setHours(0, 0, 0, 0);
                  const normalizedMinDate = new Date(minDate);
                  normalizedMinDate.setHours(0, 0, 0, 0);
                  
                  if (normalizedToday >= normalizedMinDate) {
                    onDateSelect(new Date());
                    setIsOpen(false);
                  }
                }}
                className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Year View */}
            {viewMode === 'year' && (
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {months.map((month) => (
                  <button
                    key={month.name}
                    onClick={() => handleMonthSelect(month.date)}
                    className={`py-2 text-sm rounded-lg transition-colors ${
                      month.isCurrent
                        ? 'bg-primary-600 dark:bg-primary-500 text-white'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
                      onClick={() => handleDateSelect(day.date)}
                      disabled={day.isDisabled}
                      className={`
                        aspect-square rounded-lg text-sm flex items-center justify-center transition-all
                        ${day.isSelected
                          ? 'bg-primary-500 dark:bg-primary-600 text-white'
                          : day.isToday && !day.isSelected
                          ? 'border border-primary-500 dark:border-primary-400 text-neutral-900 dark:text-white'
                          : day.isCurrentMonth
                          ? 'text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          : 'text-neutral-400 dark:text-neutral-500'
                        }
                        ${day.isDisabled
                          ? 'opacity-40 cursor-not-allowed'
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
          {window.innerWidth < 640 && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full"
                size="lg"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        value={formatDateForInput(selectedDate)}
        readOnly
      />
    </div>
  );
}