/**
 * MoonBird Shared Types and Interfaces
 */

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface AstroEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'eclipse' | 'transit' | 'meteor-shower' | 'supermoon' | 'alignment';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  imagePlaceholder: string;
  comments: Comment[];
  category?: string;
  viewingTips?: string;
}

export interface ChallengeStep {
  stepNumber: number;
  title: string;
  description: string;
  actionType?: 'log_journal' | 'set_dial_reminder' | 'clinic_visit' | 'observe_event' | 'habit_barrier' | 'life_goal';
  completed?: boolean;
}

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: 'scale' | 'text' | 'yesno' | 'choice';
  options?: string[];
  userAnswer?: string | number;
}

export interface BonusTask {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed?: boolean;
}

export interface Challenge {
  id: string;
  number?: number;
  title: string;
  level?: string;
  category: 'Mindfulness' | 'Health' | 'Astronomy' | 'Life Blueprint' | 'Self-Improvement' | 'Custom';
  description: string;
  goal?: string;
  rewardXp: number;
  date?: string;
  steps: ChallengeStep[];
  surveyQuestions: SurveyQuestion[];
  bonusTasks: BonusTask[];
  completionRequirement: string;
  comments: Comment[];
  completedBy: string[]; // list of user nicknames
  isCustom?: boolean;
  createdBy?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  theme: string;
  mood: string;
  category?: 'General' | 'Trigger Log' | 'Action Plan' | 'Astro Observation' | 'Life Goals' | 'Health Vitals';
  reminderDate?: string;
  timestamp: string;
  vitalsData?: {
    bloodPressure?: string;
    pulse?: number;
    weight?: number;
    bloodSugar?: string;
  };
}

export interface RoutineTask {
  id: string;
  name: string;
  timeFrame: string;
  completed: boolean;
  recurrence: 'Daily' | 'Weekly' | 'Monthly' | 'Annually';
  lifespan: 'Permanent' | 'Temporary';
  expiryDate?: string;
  lastCompletedTimestamp?: string; // ISO string to check for resets
}

export interface LifeGoal {
  id: string;
  title: string;
  whyItMatters: string;
  actionSteps: string[];
  commencementDate: string;
  priority: 'High' | 'Medium' | 'Low';
  completed?: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
  level: string;
  isFocusArea?: boolean;
}

export interface HealthCondition {
  id: string;
  name: string;
  category: string;
  description: string;
  preventiveMeasures: string[];
  normalRanges?: string;
}

export interface FeedPost {
  id: string;
  author: string;
  content: string;
  category: 'Perspective Entry' | 'Astro Event Snapshot' | 'Habit Avoided' | 'General';
  timestamp: string;
  likes: number;
  comments: Comment[];
}

export interface Reminder {
  id: string;
  text: string;
  datetime: string;
  interval: 'once' | '4x-daily' | 'custom';
  customHours?: string; // e.g. "08:00,12:00,16:00,20:00"
  completed: boolean;
}

export interface Idea {
  id: string;
  content: string;
  theme: 'general' | 'high-contrast' | 'dark-mode' | 'light-mode' | 'dyslexia-friendly';
  timestamp: string;
}

export interface UserProfile {
  nickname: string;
  anonymous: boolean;
  city: string;
  hobbies: string[];
  occupation: string;
  favorites: {
    planets: string[];
    constellations: string[];
    stars: string[];
  };
  favoriteStar: string;
  projects: string[];
  xp: number;
  trophies: string[];
  birthDate?: string;
  btcWalletBalance: number;
  skillsFocus?: SkillItem[];
}

export interface ChatMessage {
  id: string;
  sender: string; // 'AI' or user nickname
  senderName: string;
  text: string;
  timestamp: string;
  isProactive?: boolean;
}

export interface OnlineUser {
  id: string;
  nickname: string;
  activePhase: string;
  lastActive: string;
}

