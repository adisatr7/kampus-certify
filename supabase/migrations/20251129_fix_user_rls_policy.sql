-- Fix RLS policy untuk users table
-- Izinkan user melihat profile mereka berdasarkan email juga

-- Drop policy lama
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Buat policy baru yang lebih fleksibel
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT 
    USING (
        auth.uid() = id 
        OR 
        auth.jwt() ->> 'email' = email
    );
