import type { EventCategory } from './domain';
export function eventCategory(id: string): EventCategory {
  if (/illegal|legal-/.test(id)) return 'crime';
  if (/training|school|interest-noticed|learn/.test(id)) return 'education';
  if (/career|job-|colleague|business/.test(id)) return 'career';
  if (/friend|npc-contact|partner|romant|community/.test(id)) return 'relationships';
  if (/budget|reserve/.test(id)) return 'finance';
  if (/health|care-support|sport/.test(id)) return 'health';
  if (/creativ|action-create/.test(id)) return 'creativity';
  if (/birth|care-|milestone/.test(id)) return 'family';
  return 'everyday';
}
