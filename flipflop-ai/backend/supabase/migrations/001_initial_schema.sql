-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE integration_type AS ENUM ('slack', 'notion', 'gmail', 'github', 'teams', 'calendar');
CREATE TYPE integration_status AS ENUM ('active', 'paused', 'error', 'disconnected');
CREATE TYPE memory_type AS ENUM ('decision', 'action_item', 'discussion', 'document', 'meeting', 'other');
CREATE TYPE query_feedback AS ENUM ('helpful', 'not_helpful', 'incorrect');

-- Create teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role team_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- Create integrations table
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    type integration_type NOT NULL,
    credentials JSONB, -- Should be encrypted in production
    settings JSONB DEFAULT '{}',
    last_sync TIMESTAMP WITH TIME ZONE,
    status integration_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memories table
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_vector vector(1536),
    type memory_type NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    source_url TEXT,
    author JSONB,
    participants JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB,
    images JSONB DEFAULT '[]', -- Array of base64 encoded images or storage URLs
    attachments JSONB DEFAULT '[]', -- Array of attachment metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create queries table
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    context JSONB,
    feedback query_feedback,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extension_sessions table
CREATE TABLE extension_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create screenshots table for storing captured images
CREATE TABLE screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    size_bytes INTEGER,
    mime_type VARCHAR(100) DEFAULT 'image/png',
    width INTEGER,
    height INTEGER,
    storage_path TEXT, -- Path in Supabase Storage
    base64_data TEXT, -- Alternative: store as base64 if not using Storage
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_memories_team_timestamp ON memories(team_id, timestamp);
CREATE INDEX idx_memories_team_type ON memories(team_id, type);
CREATE INDEX idx_memories_vector ON memories USING ivfflat (content_vector vector_cosine_ops);
CREATE INDEX idx_queries_user ON queries(user_id);
CREATE INDEX idx_queries_team ON queries(team_id);
CREATE INDEX idx_extension_sessions_token ON extension_sessions(token);
CREATE INDEX idx_screenshots_team ON screenshots(team_id);
CREATE INDEX idx_screenshots_memory ON screenshots(memory_id);
CREATE INDEX idx_screenshots_user ON screenshots(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for teams (users can only access teams they're members of)
CREATE POLICY "Users can view teams they belong to"
    ON teams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their teams"
    ON team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- RLS Policies for memories
CREATE POLICY "Users can view memories from their teams"
    ON memories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = memories.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- RLS Policies for queries
CREATE POLICY "Users can view their own queries"
    ON queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create queries for their teams"
    ON queries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = queries.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- RLS Policies for screenshots
CREATE POLICY "Team members can view screenshots"
    ON screenshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = screenshots.team_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create screenshots"
    ON screenshots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = screenshots.team_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own screenshots"
    ON screenshots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenshots"
    ON screenshots FOR DELETE
    USING (auth.uid() = user_id);

-- Create Storage bucket for screenshots (run this after tables are created)
-- Note: This needs to be run through Supabase dashboard or using Supabase CLI
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'screenshots',
--     'screenshots', 
--     false,
--     10485760, -- 10MB limit
--     ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
-- );

-- Storage policies for screenshots bucket
-- CREATE POLICY "Team members can upload screenshots"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--         bucket_id = 'screenshots' AND
--         EXISTS (
--             SELECT 1 FROM team_members
--             WHERE team_members.team_id = (storage.foldername(name))[1]::uuid
--             AND team_members.user_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Team members can view screenshots"
--     ON storage.objects FOR SELECT
--     USING (
--         bucket_id = 'screenshots' AND
--         EXISTS (
--             SELECT 1 FROM team_members
--             WHERE team_members.team_id = (storage.foldername(name))[1]::uuid
--             AND team_members.user_id = auth.uid()
--         )
--     );