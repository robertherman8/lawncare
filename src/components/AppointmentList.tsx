import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, X } from 'lucide-react';

interface Appointment {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function AppointmentList() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', user?.id)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      showToast('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(id: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('customer_id', user?.id)
        .single();

      if (error) throw error;

      showToast('Appointment cancelled successfully', 'success');
      await fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      showToast('Failed to cancel appointment', 'error');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <Calendar className="w-5 h-5 mr-2" />
        Your Appointments
      </h3>

      {appointments.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No appointments scheduled</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`bg-white shadow rounded-lg p-4 ${
                appointment.status === 'cancelled' ? 'opacity-75' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {formatDate(appointment.scheduled_date)} {appointment.status === 'pending' && '(Pending Confirmation)'}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {appointment.start_time} - {appointment.end_time}
                  </p>
                  {appointment.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      Notes: {appointment.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                      getStatusBadgeColor(appointment.status)
                    }`}
                  >
                    {appointment.status}
                  </span>
                  {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
                    <button
                      onClick={() => cancelAppointment(appointment.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}