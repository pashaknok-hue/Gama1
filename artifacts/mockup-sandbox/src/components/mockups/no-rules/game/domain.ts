export type Gender = 'Девочка' | 'Мальчик';
export type Stats = { health: number; happiness: number; curiosity: number; energy: number };
export type Character = { name: string; gender: Gender; traits: string[] };
export type FamilyMember = { id: string; name: string; relationship: string; age: number; occupation: string; personality: string };
export type BirthProfile = {
  country: string; region: string; family: FamilyMember[]; className: string;
  home: string; resources: string[]; character: Character;
};
export type LifeEvent = {
  id: string; date: string; age: number; title: string; description: string;
  choices?: { label: string; result: string; effects: Partial<Stats> }[]; outcome?: string;
};
export type Life = {
  id: string; character: Character; birthDate: string; location: { country: string; region: string };
  family: FamilyMember[]; conditions: { className: string; home: string; resources: string[] };
  currentDate: string; age: number; stats: Stats; events: LifeEvent[]; createdAt: string; updatedAt: string;
};
