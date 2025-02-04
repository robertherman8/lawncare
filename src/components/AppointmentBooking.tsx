import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

interface RecurringOptions {
  isRecurring: boolean;
  weeks: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasSlots: boolean;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_appointments: number;
}

const DAYS_OF_WEEK = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
];

export default function AppointmentBooking() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [monthSchedules, setMonthSchedules] = useState<{[key: string]: boolean}>({});
  const [manualDate, setManualDate] = useState('');
  const [recurringOptions, setRecurringOptions] = useState<RecurringOptions>({
    isRecurring: false,
    weeks: 1
  });

  useEffect(() => {
    generateCalendarDays();
    fetchMonthAvailability();
  }, [currentMonth]);

  async function fetchMonthAvailability() {
    try {
      // Get first and last day of displayed calendar
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Get all schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('service_schedules')
        .select('*')
        .eq('is_active', true);

      if (schedulesError) throw schedulesError;
      if (!schedules || schedules.length === 0) return;

      // Create a map of day of week to schedules
      const schedulesByDay = schedules.reduce((acc: {[key: number]: Schedule[]}, schedule) => {
        if (!acc[schedule.day_of_week]) {
          acc[schedule.day_of_week] = [];
        }
        acc[schedule.day_of_week].push(schedule);
        return acc;
      }, {});

      // Check each day in the month
      const availability: {[key: string]: boolean} = {};
      let currentDate = new Date(firstDay);

      while (currentDate <= lastDay) {
        const dayOfWeek = currentDate.getDay();
        const dateString = currentDate.toISOString().split('T')[0];

        // If there are schedules for this day of week, mark as available
        if (schedulesByDay[dayOfWeek] && schedulesByDay[dayOfWeek].length > 0) {
          availability[dateString] = true;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      setMonthSchedules(availability);

      // Update calendar days with availability
      setCalendarDays(prevDays => 
        prevDays.map(day => ({
          ...day,
          hasSlots: availability[day.date.toISOString().split('T')[0]] || false
        }))
      );

    } catch (err) {
      console.error('Error fetching month availability:', err);
      showToast('Failed to load schedule availability', 'error');
    }
  }
  function generateCalendarDays() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];
    
    // Add days from previous month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        hasSlots: false
      });
    }
    
    // Add days of current month
    for (let date = 1; date <= lastDay.getDate(); date++) {
      const currentDate = new Date(year, month, date);
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: isSameDay(currentDate, new Date()),
        hasSlots: false
      });
    }
    
    // Add days from next month
    const remainingDays = 42 - days.length; // Always show 6 weeks
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        hasSlots: false
      });
    }
    
    setCalendarDays(days);
  }

  function isSameDay(date1: Date, date2: Date) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  function handlePreviousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function handleNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  function formatMonthYear(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  function handleDateClick(date: Date) {
    if (date >= new Date()) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  }

  async function fetchAvailableSlots(date: string) {
    setLoading(true);
    try {
      const dayOfWeek = new Date(date).getDay();

      // Get schedules for the selected day
      const { data: schedules, error: schedulesError } = await supabase
        .from('service_schedules')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (schedulesError) throw schedulesError;

      if (!schedules || schedules.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Get existing appointments for the date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('scheduled_date', date)
        .eq('status', 'scheduled');

      if (appointmentsError) throw appointmentsError;

      // Generate time slots
      const slots: TimeSlot[] = [];
      schedules.forEach((schedule: Schedule) => {
        const [startHour, startMinute] = schedule.start_time.split(':');
        const [endHour, endMinute] = schedule.end_time.split(':');
        const start = new Date(2000, 0, 1, parseInt(startHour), parseInt(startMinute));
        const end = new Date(2000, 0, 1, parseInt(endHour), parseInt(endMinute));

        while (start < end) {
          const slotStart = start.toTimeString().slice(0, 5);
          start.setMinutes(start.getMinutes() + 60); // 1-hour slots
          const slotEnd = start.toTimeString().slice(0, 5);

          const existingAppointments = appointments?.filter(
            app => app.start_time === slotStart
          ).length || 0;

          slots.push({
            start_time: slotStart,
            end_time: slotEnd,
            available: existingAppointments < schedule.max_appointments
          });
        }
      });

      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      showToast('Failed to load available time slots', 'error');
    } finally {
      setLoading(false);
    }
  }

  function getNextWeekDate(date: string, weeksToAdd: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + (weeksToAdd * 7));
    return d.toISOString().split('T')[0];
  }

  async function handleBooking() {
    if (!selectedDate || !selectedSlot) {
      showToast('Please select a date and time slot', 'error');
      console.log('Booking failed: No date or time slot selected', { selectedDate, selectedSlot });
      return;
    }

    if (!user?.id) {
      showToast('You must be logged in to book appointments', 'error');
      console.log('Booking failed: No user ID');
      return;
    }

    const selectedDayOfWeek = new Date(selectedDate).getDay();
    const isFriday = selectedDayOfWeek === 5;

    setLoading(true);
    try {
      console.log('Starting appointment booking process', {
        date: selectedDate,
        slot: selectedSlot,
        recurring: recurringOptions.isRecurring,
        weeks: recurringOptions.weeks
      });

      let appointments = [{
        customer_id: user?.id,
        scheduled_date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        status: 'scheduled',
        notes: notes.trim() || null
      }];

      // Add recurring appointments if enabled and it's a Friday
      if (isFriday && recurringOptions.isRecurring && recurringOptions.weeks > 1) {
        for (let i = 1; i < recurringOptions.weeks; i++) {
          appointments.push({
          customer_id: user?.id,
          scheduled_date: getNextWeekDate(selectedDate, i),
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          status: 'pending',
          notes: notes.trim() || null
        });
        }
      }

      console.log('Attempting to insert appointments', { count: appointments.length });

      const { error } = await supabase
        .from('appointments')
        .insert(appointments);

      if (error) {
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw error;
      }

      const message = appointments.length > 1 
        ? `${appointments.length} recurring appointments requested successfully`
        : 'Appointment request submitted successfully';
      setBookingStatus('success');
      showToast(message, 'success');

      setSelectedDate('');
      setSelectedSlot(null);
      setNotes('');
      setRecurringOptions({ isRecurring: false, weeks: 1 });
    } catch (err) {
      console.error('Error booking appointment:', err);
      const errorMessage = err instanceof Error 
        ? err.message
        : 'Failed to book appointment';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
        <Calendar className="w-6 h-6 mr-2 text-indigo-600" aria-hidden="true" />
        Book an Appointment
      </h3>

      <div className="space-y-8">
        {/* Manual Date Input */}
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label htmlFor="manualDate" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Date Manually
            </label>
            <input
              type="date"
              id="manualDate"
              min={today}
              value={manualDate}
              onChange={(e) => {
                setManualDate(e.target.value);
                setSelectedDate(e.target.value);
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setManualDate('');
              setSelectedDate('');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">
            {formatMonthYear(currentMonth)}
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {/* Day headers */}
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-700"
            >
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const isSelected = selectedDate === day.date.toISOString().split('T')[0];
            const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0));
            
            return (
              <button
                key={index}
                onClick={() => {
                  if (!isPast) {
                    handleDateClick(day.date);
                    setManualDate(day.date.toISOString().split('T')[0]);
                  }
                }}
                disabled={isPast}
                className={`
                  bg-white p-3 h-24 relative hover:bg-gray-50 
                  ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                  ${isSelected ? 'bg-indigo-50 font-semibold' : ''}
                  ${isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  flex flex-col items-center
                `}
              >
                <span className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-full
                  ${day.isToday ? 'bg-indigo-600 text-white' : ''}
                  ${isSelected && !day.isToday ? 'bg-indigo-100' : ''}
                `}>
                  {day.date.getDate()}
                </span>
                {day.hasSlots && day.isCurrentMonth && (
                  <div className="mt-1 flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Time Slots
            </label>
            {loading ? (
              <div className="text-center py-4">Loading available slots...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No available slots for this date
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.available ? slot : null)}
                    className={`
                      px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center
                      ${slot.available
                        ? selectedSlot === slot
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {slot.start_time} - {slot.end_time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedDate && new Date(selectedDate).getDay() === 5 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="recurring"
                checked={recurringOptions.isRecurring}
                onChange={(e) => setRecurringOptions(prev => ({
                  ...prev,
                  isRecurring: e.target.checked
                }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="recurring" className="ml-2 block text-sm font-medium text-gray-700">
                Make this a recurring Friday appointment
              </label>
            </div>
            
            {recurringOptions.isRecurring && (
              <div className="ml-6">
                <label htmlFor="weeks" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of weeks
                </label>
                <select
                  id="weeks"
                  value={recurringOptions.weeks}
                  onChange={(e) => setRecurringOptions(prev => ({
                    ...prev,
                    weeks: parseInt(e.target.value)
                  }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {[...Array(26)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? 'week' : 'weeks'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  This will book appointments for {recurringOptions.weeks} consecutive Fridays
                </p>
              </div>
            )}
          </div>
        )}

        {selectedSlot && (
          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Additional Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Any special requests or notes..."
            />
          </div>
        )}

        <div className="flex justify-end pt-6">
          <button
            type="button"
            onClick={handleBooking}
            disabled={loading || !selectedDate || !selectedSlot}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Calendar className="w-5 h-5 mr-2" />
            {loading ? 'Booking...' : recurringOptions.isRecurring 
              ? `Book ${recurringOptions.weeks} Appointments` 
              : 'Request Appointment'
            }
          </button>
        </div>
        {bookingStatus === 'success' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Your appointment request has been submitted. A manager will review and confirm your appointment shortly.
              You can check the status in your appointments list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}