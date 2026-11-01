import type { PersonalName } from './names';
import type { Birthplace } from './world';

export type Gender = 'Девочка' | 'Мальчик';
export type Stats = { health: number; happiness: number; curiosity: number; energy: number };
export type Character = { name: string; personalName?: PersonalName; gender: Gender; traits: string[] };
export type FamilyMember = { id: string; name: string; personalName?: PersonalName; relationship: string; age: number; occupation: string; personality: string };
export type BirthProfile = {
  country: string; region: string; birthplace?: Birthplace; family: FamilyMember[]; className: string;
  home: string; resources: string[]; character: Character;
};
export type EventParticipant = {
  kind: 'character' | 'family' | 'person' | 'world' | 'object' | 'place';
  name: string;
  id?: string;
};
export type LifeEvent = {
  id: string; date: string; age: number; title: string; description: string;
  kind?: 'life' | 'action' | 'decision' | 'milestone';
  templateId?: string;
  actor?: EventParticipant;
  target?: EventParticipant;
  context?: string;
  resolution?: { actor: EventParticipant; choiceIndex: number };
  eligibility?: { minAge: number; maxAge?: number };
  choices?: { label: string; result: string; effects: Partial<Stats> }[]; outcome?: string;
};
export type Life = {
  id: string; character: Character; birthDate: string; location: { country: string; region: string; birthplace?: Birthplace };
  family: FamilyMember[]; conditions: { className: string; home: string; resources: string[] };
  currentDate: string; age: number; stats: Stats; events: LifeEvent[]; createdAt: string; updatedAt: string;
};
