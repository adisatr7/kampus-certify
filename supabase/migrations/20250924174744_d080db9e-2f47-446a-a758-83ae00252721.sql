-- Create enums for roles and statuses
CREATE TYPE public.user_role AS ENUM ('admin', 'dosen', 'rektor', 'dekan');
CREATE TYPE public.certificate_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE public.document_status AS ENUM ('pending', 'signed', 'revoked');

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role public.user_role NOT NULL,
    google_id TEXT UNIQUE,
    certificate_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL, -- Will be encrypted in application
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.certificate_status DEFAULT 'active',
    revoked_at TIMESTAMP WITH TIME ZONE,
    algorithm TEXT DEFAULT 'RSA-2048',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT,
    signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMP WITH TIME ZONE,
    qr_code_url TEXT,
    status public.document_status DEFAULT 'pending',
    certificate_id UUID REFERENCES public.certificates(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit_trail table
CREATE TABLE public.audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key constraint for certificate_id in users table
ALTER TABLE public.users ADD CONSTRAINT fk_users_certificate_id 
    FOREIGN KEY (certificate_id) REFERENCES public.certificates(id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS public.user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE id = user_uuid;
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_uuid AND role = 'admin'
    );
$$;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS Policies for certificates table
CREATE POLICY "Users can view their own certificates" ON public.certificates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates" ON public.certificates
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage certificates" ON public.certificates
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for documents table
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents" ON public.documents
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents" ON public.documents
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for audit_trail table (read-only for users, full access for admins)
CREATE POLICY "Users can view their own audit trail" ON public.audit_trail
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit trails" ON public.audit_trail
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit trails" ON public.audit_trail
    FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON public.certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create audit trail entries
CREATE OR REPLACE FUNCTION public.create_audit_entry(
    p_user_id UUID,
    p_action TEXT,
    p_description TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.audit_trail (user_id, action, description)
    VALUES (p_user_id, p_action, p_description);
$$;

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_google_id ON public.users(google_id);
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX idx_certificates_serial_number ON public.certificates(serial_number);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_audit_trail_user_id ON public.audit_trail(user_id);
CREATE INDEX idx_audit_trail_timestamp ON public.audit_trail(timestamp);