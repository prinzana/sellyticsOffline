-- Enable Realtime for Collaboration Tables
-- This fixes the issue where the creator doesn't see when someone joins
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_collaboration_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_collaboration_participants;
