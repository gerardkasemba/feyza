-- Migration: Enable Supabase Real-time for key tables
-- Run this in your Supabase SQL Editor

-- Enable real-time for loans table
ALTER PUBLICATION supabase_realtime ADD TABLE loans;

-- Enable real-time for payment_schedule table
ALTER PUBLICATION supabase_realtime ADD TABLE payment_schedule;

-- Enable real-time for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable real-time for loan_requests table (for guest borrowers)
ALTER PUBLICATION supabase_realtime ADD TABLE loan_requests;

-- Enable real-time for transfers table (for tracking Dwolla transfers)
ALTER PUBLICATION supabase_realtime ADD TABLE transfers;

-- Enable real-time for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable real-time for business_profiles (for admin verification updates)
ALTER PUBLICATION supabase_realtime ADD TABLE business_profiles;

-- Verify enabled tables
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
