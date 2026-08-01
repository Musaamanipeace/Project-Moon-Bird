import "server-only";

/**
 * Placeholder database types.
 *
 * Replaced wholesale by `npm run db:types`, which runs
 * `supabase gen types typescript --local > lib/supabase/types.ts` against the
 * migrations in supabase/migrations/.
 *
 * Until then every table is permissive. Two constraints shape this stub:
 *
 *  - Each table needs Row/Insert/Update. supabase-js derives its generics from
 *    them, and a table entry missing them makes .insert()/.update() resolve to
 *    `never`, so no real query typechecks.
 *  - `Tables` must map LITERAL table names. An index signature
 *    (Record<string, PermissiveTable>) also degrades to `never`, because the
 *    client resolves the relation name against the key union.
 *
 * So the names below are listed explicitly, mirroring supabase/migrations/.
 * They intentionally do not describe columns: generation will overwrite this,
 * and asserting a hand-written schema here would invite drift.
 */
type PermissiveTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      // 0002_profiles.sql
      profiles: PermissiveTable;
      // 0003_core.sql
      challenges: PermissiveTable;
      challenge_logs: PermissiveTable;
      badges: PermissiveTable;
      notebook_entries: PermissiveTable;
      events: PermissiveTable;
      user_calendar_events: PermissiveTable;
      // 0004_portfolio.sql
      profile_fields: PermissiveTable;
      user_assets: PermissiveTable;
      user_favorites: PermissiveTable;
      user_links: PermissiveTable;
      // 0005_ads.sql
      advertisers: PermissiveTable;
      ad_campaigns: PermissiveTable;
      surveys: PermissiveTable;
      completion_tokens: PermissiveTable;
      ad_view_sessions: PermissiveTable;
      payout_accounts: PermissiveTable;
      // 0006_social.sql
      chat_rooms: PermissiveTable;
      chat_messages: PermissiveTable;
      audit_assignments: PermissiveTable;
      // 0007_games.sql
      game_levels: PermissiveTable;
      user_game_progress: PermissiveTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      challenge_status:
        | "unfinished"
        | "finished"
        | "completed_unaudited"
        | "evolving";
    };
    CompositeTypes: Record<string, never>;
  };
};
