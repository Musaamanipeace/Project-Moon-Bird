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
    // The SECURITY DEFINER RPCs from 0009_functions.sql / 0010_challenge_rpcs.sql.
    // Listed literally for the same reason as Tables: .rpc() resolves the
    // function name against this key union, so an index signature would type
    // every call as `never`. Args/Returns are declared because a typo in a
    // parameter name is otherwise a silent runtime 404 from PostgREST.
    Functions: {
      grant_advertiser_role: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      award_badge: {
        Args: { p_user_id: string; p_challenge_id: string };
        // boolean since 0010 — true only when a row was actually inserted.
        Returns: boolean;
      };
      complete_challenge: {
        Args: {
          p_user_id: string;
          p_challenge_id: string;
          p_log_date: string;
          p_status: string;
        };
        Returns: undefined;
      };
      recompute_streak: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
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
