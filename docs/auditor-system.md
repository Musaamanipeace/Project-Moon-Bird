# Auditor Assignment System

## Overview

When a challenge includes an `auditorQuestionnaire`, submitted entries must be reviewed by an assigned auditor before the challenge can be marked as fully `Finished`. This document describes the planned assignment logic and current development structure.

## Challenge States

Once a challenge is launched, it carries one of the following states per participant:

- `Unfinished` — not yet started or submitted
- `Finished` — completed and audited (or no audit required)
- `Completed / Unaudited` — submitted but awaiting auditor review
- `Evolving` — potentially endless; no fixed completion point

## Auditor Assignment Strategy

Auditors are assigned based on their activity level:

1. **Priority by Activity**: Users with higher activity (login frequency, challenge completions, community contributions) receive assignment priority.
2. **Threshold Cap**: There is a maximum number of concurrent audit assignments per auditor to prevent overload.
3. **Inclusion Mechanism**: Below the threshold, less active users are given the chance to audit to ensure broad participation and prevent elite-user monopolies.

### Assignment Flow

1. Participant submits a challenge with an `auditorQuestionnaire`.
2. Backend marks the participant state as `Completed / Unaudited`.
3. Backend selects an auditor from the pool of eligible users using activity-weighted random selection.
4. Auditor receives the submission and evaluates using the questionnaire prompts.
5. Upon evaluation, backend updates the participant state to `Finished`.

## Development Structure

### Current State

- The `Challenge` type includes an optional `auditorQuestionnaire` field (`SurveyQuestion[]`).
- The `/api/challenges/:id/complete` endpoint sets participant state to `Completed / Unaudited` when an auditor questionnaire is present.
- The frontend execution modal renders the auditor questionnaire section (read-only for the participant; editable for the assigned auditor).
- No active auditor pool or assignment engine exists yet.

### Planned Implementation

- **Auditor Pool API**: `/api/auditors/pool` — returns eligible auditors ranked by activity score.
- **Assignment Endpoint**: `/api/challenges/:id/assign-auditor` — assigns an auditor to a `Completed / Unaudited` submission.
- **Auditor Dashboard**: Frontend view where assigned auditors see pending reviews, submit evaluations, and earn reward XP.
- **Activity Score**: Derived from login count, challenge completions, comment activity, and chat engagement.

### Data Model

```typescript
interface AuditorAssignment {
  challengeId: string;
  participantNickname: string;
  auditorNickname: string;
  assignedAt: string;
  status: 'pending' | 'evaluated';
  evaluation?: {
    scores: Record<string, number | string>;
    overallComment: string;
    evaluatedAt: string;
  };
}
```

## Integration Notes

- Creator-sponsored rewards (cash, digital services, digital assets) may be disbursed only after an auditor marks a challenge as `Finished`.
- The `Evolving` state bypasses the auditor flow; evolving challenges are considered perpetually in progress.
- AI-assisted pre-auditing may be used to flag submissions for human auditor review or auto-approve clear cases.
