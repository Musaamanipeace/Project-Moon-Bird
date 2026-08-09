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
  optional?: boolean;
  mediaAssets?: MediaAsset[];
  toolAction?: {
    view: 'notes' | 'dial' | 'calendar' | 'profile' | 'chat' | 'events';
    actionType: 'create_journal' | 'create_routine' | 'create_reminder' | 'create_goal' | 'observe_moon' | 'create_event' | 'update_profile' | 'send_chat' | 'take_snapshot' | 'observe_event';
    label: string;
    description: string;
    verifyTag?: string;
  };
}

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: 'scale' | 'text' | 'yesno' | 'choice';
  options?: string[];
}

export interface BonusTask {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed?: boolean;
}

export interface ParticipantRole {
  role: string;
  description: string;
  isLeader?: boolean;
}

export interface Checkpoint {
  id: string;
  label: string;
  description: string;
  stepNumber: number;
}

export interface TargetMilestone {
  id: string;
  label: string;
  description: string;
  rewardXp: number;
}

export interface CreatorReward {
  id: string;
  type: 'cash' | 'digital_service' | 'digital_asset';
  description: string;
  value: string;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
  placement: 'between_steps' | 'during_step';
  stepNumber?: number;
}

export interface ChallengeParticipantState {
  nickname: string;
  state: 'Unfinished' | 'Finished' | 'Completed / Unaudited' | 'Evolving';
  submittedAt?: string;
  submittedNote?: string;
}

export interface ChallengeStepAction {
  id: string;
  challengeId: string;
  stepNumber: number;
  actionType: string;
  completedAt: string;
  data?: Record<string, any>;
}

export interface Challenge {
  id: string;
  number?: number;
  title: string;
  level?: string;
  category: 'Mindfulness' | 'Health' | 'Astronomy' | 'Life Blueprint' | 'Self-Improvement' | 'Custom';
  scope: 'Skills-Related' | 'Self-Improvement/Wellbeing' | 'Fun-Based';
  participationMode: 'Solo' | 'Group';
  participantRoles?: ParticipantRole[];
  dynamicSteps?: boolean;
  checkpoints?: Checkpoint[];
  targetMilestones?: TargetMilestone[];
  description: string;
  goal?: string;
  rewardXp: number;
  creatorSponsoredRewards?: CreatorReward[];
  date?: string;
  steps: ChallengeStep[];
  mediaAssets?: MediaAsset[];
  surveyQuestions: SurveyQuestion[];
  auditorQuestionnaire?: SurveyQuestion[];
  bonusTasks: BonusTask[];
  completionRequirement: string;
  comments: Comment[];
  participants: ChallengeParticipantState[];
  isCustom?: boolean;
  createdBy?: string;
  state: 'Unfinished' | 'Finished' | 'Completed / Unaudited' | 'Evolving';
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

// Social feed item (backend-driven, shareable from many sources)
export type FeedKind =
  | 'catalogue_share'   // a shared catalogue entry
  | 'challenge_created' // a created challenge shared
  | 'ad_share'          // a created campaign/ad shared
  | 'event_comment'     // a comment on an event shared
  | 'challenge_badge';  // a completed-challenge badge

export interface FeedItem {
  id: string;
  author: string;
  kind: FeedKind;
  title?: string;
  body?: string;
  refId?: string;      // id of the referenced entity (event, challenge, ad, catalogue item)
  refType?: string;    // 'event' | 'challenge' | 'ad' | 'brand' | 'book'
  experience?: string; // challenge-completion experience text ("view player's challenge experience")
  timestamp: string;
  likes?: number;
}

export interface Brand {
  id: string;
  name: string;
  tagline: string;
  category: string;
  interests: string[];
  logoEmoji: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  tagline: string;
  category: string;
  interests: string[];
  emoji: string;
}

export interface PublicUser {
  id: string;
  nickname: string;
  interests: string[];
  brandLinks: string[];
  avatarEmoji: string;
  bio?: string;
  score?: number;
  sharedInterests?: string[];
  sharedBrands?: string[];
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

