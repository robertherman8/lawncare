/*
  # Update invoice status transitions

  Updates the validate_invoice_status_transition function to support:
  - Transition from 'sent' to 'opened' status
  - Better status flow: draft -> sent -> opened -> paid
  - Improved validation logic
*/

CREATE OR REPLACE FUNCTION validate_invoice_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Allow all valid status transitions
  IF (OLD.status = 'draft' AND NEW.status = 'sent') OR
     (OLD.status = 'sent' AND NEW.status IN ('opened', 'paid')) OR
     (OLD.status = 'opened' AND NEW.status = 'paid') OR
     OLD.status = NEW.status THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;