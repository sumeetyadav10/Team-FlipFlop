-- Additional RLS Policies that were missing

-- Allow users to create teams
CREATE POLICY "Users can create teams"
    ON teams FOR INSERT
    WITH CHECK (true);

-- Allow team owners/admins to update teams
CREATE POLICY "Team owners can update teams"
    ON teams FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

-- Allow team members to be added (by owners/admins)
CREATE POLICY "Team owners can manage members"
    ON team_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- Allow team members to create integrations
CREATE POLICY "Team members can create integrations"
    ON integrations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = integrations.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Allow team members to view integrations
CREATE POLICY "Team members can view integrations"
    ON integrations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = integrations.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Allow team members to update integrations
CREATE POLICY "Team members can update integrations"
    ON integrations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = integrations.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Allow team members to create memories
CREATE POLICY "Team members can create memories"
    ON memories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = memories.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Allow team members to update memories
CREATE POLICY "Team members can update memories"
    ON memories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = memories.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Allow users to manage their extension sessions
CREATE POLICY "Users can create extension sessions"
    ON extension_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their extension sessions"
    ON extension_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their extension sessions"
    ON extension_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their extension sessions"
    ON extension_sessions FOR DELETE
    USING (auth.uid() = user_id);