/*
  # Add scheduling system

  1. New Tables
    - `service_schedules`
      - Defines available time slots for services
      - Configurable by managers
    - `appointments`
      - Tracks customer appointments
      - Links to invoices and customers

  2. Security
    - Enable RLS on new tables
    - Managers can manage schedules
    - Customers can view schedules and book appointments
*/

-- Create service schedules table
CREATE TABLE service_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_appointments integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id),
  invoice_id uuid REFERENCES invoices(id),
  scheduled_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT future_date CHECK (scheduled_date >= CURRENT_DATE)
);

-- Enable RLS
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Service schedules policies
CREATE POLICY "Managers can manage their schedules"
  ON service_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
    AND manager_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
    AND manager_id = auth.uid()
  );

CREATE POLICY "Everyone can view active schedules"
  ON service_schedules
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Appointments policies
CREATE POLICY "Customers can view and manage their appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );

-- Function to check appointment availability
CREATE OR REPLACE FUNCTION check_appointment_availability(
  p_date date,
  p_start_time time,
  p_end_time time
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week integer;
  v_schedule_exists boolean;
  v_slot_available boolean;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if schedule exists for this time slot
  SELECT EXISTS (
    SELECT 1
    FROM service_schedules
    WHERE day_of_week = v_day_of_week
    AND start_time <= p_start_time
    AND end_time >= p_end_time
    AND is_active = true
  ) INTO v_schedule_exists;

  IF NOT v_schedule_exists THEN
    RETURN false;
  END IF;

  -- Check if slot is available (not exceeding max_appointments)
  SELECT EXISTS (
    SELECT 1
    FROM service_schedules s
    WHERE s.day_of_week = v_day_of_week
    AND s.start_time <= p_start_time
    AND s.end_time >= p_end_time
    AND s.is_active = true
    AND (
      SELECT COUNT(*)
      FROM appointments a
      WHERE a.scheduled_date = p_date
      AND a.start_time = p_start_time
      AND a.status = 'scheduled'
    ) < s.max_appointments
  ) INTO v_slot_available;

  RETURN v_slot_available;
END;
$$;