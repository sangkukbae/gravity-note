-- Create beta_users table for managing beta access
CREATE TABLE IF NOT EXISTS beta_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invitation_code text UNIQUE,
    status text DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive', 'expired')),
    invited_at timestamptz DEFAULT now(),
    accepted_at timestamptz,
    expires_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Create beta_feedback table for collecting feedback
CREATE TABLE IF NOT EXISTS beta_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text DEFAULT 'general' CHECK (type IN ('general', 'bug', 'feature_request', 'improvement')),
    content text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create feature_flags_usage table to track feature flag usage
CREATE TABLE IF NOT EXISTS feature_flags_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_name text NOT NULL,
    enabled boolean NOT NULL,
    variant text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    
    UNIQUE(user_id, flag_name, created_at::date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_beta_users_user_id ON beta_users(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_users_status ON beta_users(status);
CREATE INDEX IF NOT EXISTS idx_beta_users_invitation_code ON beta_users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at ON beta_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_flags_usage_user_flag ON feature_flags_usage(user_id, flag_name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_usage_flag_name ON feature_flags_usage(flag_name);

-- Create RLS (Row Level Security) policies
ALTER TABLE beta_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags_usage ENABLE ROW LEVEL SECURITY;

-- Beta users can only see their own records
CREATE POLICY "Users can view own beta status" ON beta_users
    FOR SELECT USING (auth.uid() = user_id);

-- Beta users can update their own acceptance status
CREATE POLICY "Users can update own beta status" ON beta_users
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all beta users
CREATE POLICY "Service role can manage beta users" ON beta_users
    FOR ALL USING (auth.role() = 'service_role');

-- Beta feedback policies
CREATE POLICY "Users can insert own feedback" ON beta_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON beta_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can view all feedback
CREATE POLICY "Service role can view all feedback" ON beta_feedback
    FOR SELECT USING (auth.role() = 'service_role');

-- Feature flags usage policies
CREATE POLICY "Users can insert own flag usage" ON feature_flags_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own flag usage" ON feature_flags_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can view all flag usage
CREATE POLICY "Service role can view all flag usage" ON feature_flags_usage
    FOR SELECT USING (auth.role() = 'service_role');

-- Create a function to check if user is beta user
CREATE OR REPLACE FUNCTION is_beta_user(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS(
        SELECT 1 FROM beta_users 
        WHERE user_id = user_uuid 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
$$;

-- Create a function to generate invitation codes
CREATE OR REPLACE FUNCTION generate_beta_invitation_code()
RETURNS text
LANGUAGE sql
AS $$
    SELECT 'beta_' || encode(gen_random_bytes(16), 'base64')::text;
$$;

-- Create a function to accept beta invitation
CREATE OR REPLACE FUNCTION accept_beta_invitation(invitation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    beta_user_record beta_users%ROWTYPE;
    result jsonb;
BEGIN
    -- Find the invitation
    SELECT * INTO beta_user_record
    FROM beta_users
    WHERE invitation_code = accept_beta_invitation.invitation_code
    AND status = 'invited'
    AND (expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation code'
        );
    END IF;

    -- Update the record to active
    UPDATE beta_users
    SET 
        status = 'active',
        accepted_at = now(),
        updated_at = now()
    WHERE id = beta_user_record.id;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'user_id', beta_user_record.user_id
    );
END;
$$;

-- Create updated_at trigger for beta_users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beta_users_updated_at BEFORE UPDATE ON beta_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beta_feedback_updated_at BEFORE UPDATE ON beta_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();