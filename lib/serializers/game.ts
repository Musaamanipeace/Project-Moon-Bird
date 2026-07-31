import { toRFC3339 } from "./time";

export function gameLevelResponse(p: {
  id: string;
  word: string;
  phrase: string;
  difficulty: string;
  hints: unknown[];
  category: string;
}) {
  return {
    id: p.id,
    word: p.word,
    phrase: p.phrase,
    difficulty: p.difficulty,
    hints: p.hints,
    category: p.category,
  };
}

export function gameProgressResponse(p: {
  id: string;
  user_id: string;
  level_id: string;
  score: number;
  hints_used: number;
  completed: boolean;
  completed_at: string | null;
}) {
  return {
    id: p.id,
    userId: p.user_id,
    levelId: p.level_id,
    score: p.score,
    hintsUsed: p.hints_used,
    completed: p.completed,
    completedAt: p.completed_at ? toRFC3339(p.completed_at) : null,
  };
}