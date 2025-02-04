import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock } from 'lucide-react';

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_appointments: number;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function ScheduleManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickSchedule, setQuickSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    max_appointments: 1,
    is_active: true
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  function handleQuickSchedule() {
    setQuickSchedule(true);
    // Create standard business hours schedule for weekdays
    const promises = [1, 2, 3, 4, 5].map(day => 
      supabase.from('service_schedules').insert({
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        max_appointments: 3,
        manager_id: user?.id,
        is_active: true
      })
    );

    Promise.all(promises)
      .then(() => {
        showToast('Default schedules created successfully', 'success');
        fetchSchedules();
      })
      .catch(err => {
        console.error('Error creating default schedules:', err);
        showToast('Failed to create default schedules', 'error');
      })
      .finally(() => setQuickSchedule(false));
  }

  async function fetchSchedules() {
    try {
      const { data, error } = await supabase
        .from('service_schedules')
        .select('*')
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      showToast('Failed to load schedules', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('service_schedules')
        .insert({
          ...newSchedule,
          manager_id: user?.id
        });

      if (error) throw error;

      showToast('Schedule created successfully', 'success');
      await fetchSchedules();
      
      // Reset form
      setNewSchedule({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        max_appointments: 1,
        is_active: true
      });
    } catch (err) {
      console.error('Error creating schedule:', err);
      showToast('Failed to create schedule', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleScheduleStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('service_schedules')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await fetchSchedules();
      showToast('Schedule updated successfully', 'success');
    } catch (err) {
      console.error('Error updating schedule:', err);
      showToast('Failed to update schedule', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Manage Schedules
        </h3>

        {schedules.length === 0 && (
          <div className="mb-6">
            <button
              onClick={handleQuickSchedule}
              disabled={quickSchedule}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {quickSchedule ? 'Creating Schedules...' : 'Create Default Business Hours (9 AM - 5 PM, Mon-Fri)'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
                Day of Week
              </label>
              <select
                id="day_of_week"
                value={newSchedule.day_of_week}
                onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="max_appointments" className="block text-sm font-medium text-gray-700">
                Max Appointments
              </label>
              <input
                type="number"
                id="max_appointments"
                min="1"
                value={newSchedule.max_appointments}
                onChange={(e) => setNewSchedule({ ...newSchedule, max_appointments: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                Start Time
                <span className="text-gray-500 text-xs ml-1">(e.g., 09:00)</span>
              </label>
              <input
                type="time"
                id="start_time"
                value={newSchedule.start_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                End Time
                <span className="text-gray-500 text-xs ml-1">(e.g., 17:00)</span>
              </label>
              <input
                type="time"
                id="end_time"
                value={newSchedule.end_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={newSchedule.is_active}
              onChange={(e) => setNewSchedule({ ...newSchedule, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Current Schedules
        </h3>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No schedules found</div>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`p-4 border rounded-lg ${
                  schedule.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {DAYS_OF_WEEK[schedule.day_of_week]}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {schedule.start_time} - {schedule.end_time}
                    </p>
                    <p className="text-sm text-gray-500">
                      Max {schedule.max_appointments} appointment{schedule.max_appointments > 1 ? 's' : ''} per slot
                    </p>
                  </div>
                  <button
                    onClick={() => toggleScheduleStatus(schedule.id, schedule.is_active)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      schedule.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}