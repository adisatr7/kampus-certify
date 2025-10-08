-- Update handle_new_user function to also create a certificate with unique RSA key pair
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.users (id, email, name, role, google_id)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'dosen',
    new.raw_user_meta_data->>'provider_id'
  );
  
  -- Certificate will be created by edge function after user creation
  -- to ensure unique RSA key pair generation
  
  RETURN new;
END;
$function$;