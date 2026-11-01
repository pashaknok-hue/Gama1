import { Battery, Brain, Coins, Heart, Sun } from 'lucide-react';
import type { Life } from '../../game/domain';

function familyFundsLabel(className: string) {
  if (className === 'Рабочая семья') return 'ограничены';
  if (className === 'Уверенный достаток') return 'есть запас';
  return 'скромный запас';
}

export default function CharacterStatus({ life }: { life: Life }) {
  const stats = [
    { icon: Heart, label: 'здоровье', value: life.stats.health, tone: 'health' },
    { icon: Sun, label: 'настроение', value: life.stats.happiness, tone: 'mood' },
    { icon: Battery, label: 'энергия', value: life.stats.energy, tone: 'energy' },
    { icon: Brain, label: 'интерес', value: life.stats.curiosity, tone: 'curiosity' },
  ];

  return (
    <section className="nr-status" aria-label="Состояние персонажа" data-testid="display-stats">
      {stats.map(({ icon: Icon, label, value, tone }) => (
        <div className={`nr-status-item ${tone}`} key={tone} data-testid={`stat-${tone}`}>
          <div className="nr-status-title">
            <Icon size={14} strokeWidth={1.8} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
          <div className="nr-status-track" aria-label={`${label}: ${value} из 100`}>
            <span style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
      <div className="nr-status-item money" data-testid="stat-family-funds">
        <div className="nr-status-title">
          <Coins size={14} strokeWidth={1.8} />
          <span>деньги</span>
          <strong>{familyFundsLabel(life.conditions.className)}</strong>
        </div>
        <div className="nr-money-sub">по условиям семьи</div>
      </div>
    </section>
  );
}
