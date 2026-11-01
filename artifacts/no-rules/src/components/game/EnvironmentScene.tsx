import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import type { BirthProfile, Life } from '../../game/domain';

type EnvironmentSceneProps = {
  life?: Life;
  profile?: BirthProfile;
};

type SpecialExperience =
  | { kind: 'cutscene'; title: string; description: string }
  | { kind: 'minigame'; title: string; description: string };

function ExperienceStage({
  children,
  experience = null,
}: {
  children: ReactNode;
  experience?: SpecialExperience | null;
}) {
  return (
    <div className="nr-stage-wrap">
      {children}
      {experience && (
        <section className="nr-special-stage" aria-label={experience.kind === 'cutscene' ? 'Особая сцена' : 'Мини-игра'}>
          <div className="nr-special-stage-inner">
            <strong>{experience.kind === 'cutscene' ? 'КАТ-СЦЕНА' : 'МИНИ-ИГРА'}</strong>
            <h2>{experience.title}</h2>
            <p>{experience.description}</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default function EnvironmentScene({ life, profile }: EnvironmentSceneProps) {
  const character = life?.character ?? profile?.character;
  const country = life?.location.country ?? profile?.country;
  const region = life?.location.region ?? profile?.region;
  const home = life?.conditions.home ?? profile?.home;
  const className = life?.conditions.className ?? profile?.className;
  const age = life?.age ?? 0;

  if (!character || !country || !region || !home || !className) return null;

  const steppe = country === 'Казахстан';
  const mountains = country === 'Грузия' || country === 'Армения';
  const familyHome = home.toLowerCase().includes('дом') || home.toLowerCase().includes('сад');
  const environment = steppe ? 'степной край' : mountains ? 'горный район' : familyHome ? 'тихий пригород' : 'жилой квартал';
  const palette = steppe
    ? { sky: '#454d5a', ridge: '#77816f', ground: '#37433f', structure: '#70634f', light: '#d9b86d' }
    : mountains
      ? { sky: '#414b58', ridge: '#687d78', ground: '#303c3b', structure: '#64615a', light: '#d7ae6e' }
      : { sky: '#394451', ridge: '#566b68', ground: '#283438', structure: '#515d68', light: '#dfbc76' };
  const figureHeight = age < 2 ? 28 : age < 7 ? 36 : age < 18 ? 47 : 55;
  const figureTop = 178 - figureHeight;
  const clothing = character.gender === 'Девочка' ? '#986e78' : '#6f8991';
  const caption = age < 3 ? 'Мир начинается с дома' : age < 7 ? 'Всё вокруг — открытие' : age < 18 ? 'Время искать свой путь' : 'Каждый день — новая глава';

  return (
    <ExperienceStage>
      <div className="nr-scene" aria-label={`${character.name} в окружении: ${home}, ${region}, ${country}`}>
        <svg
          className="nr-scene-art"
          viewBox="0 0 760 224"
          role="img"
          aria-label={`Пиксельный пейзаж: ${environment}, ${region}`}
          shapeRendering="crispEdges"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect width="760" height="224" fill={palette.ground} />
          <rect width="760" height="112" fill={palette.sky} />
          <rect x="0" y="111" width="760" height="72" fill={palette.ridge} />
          {steppe ? (
            <>
              <polygon points="0,132 140,92 280,132" fill="#687567" />
              <polygon points="220,137 420,82 620,137" fill="#5b6d64" />
              <polygon points="475,138 620,101 760,139" fill="#73816b" />
              <rect x="0" y="164" width="760" height="20" fill="#788264" />
            </>
          ) : mountains ? (
            <>
              <polygon points="0,145 145,54 264,145" fill="#627371" />
              <polygon points="111,145 305,36 468,145" fill="#566b6c" />
              <polygon points="330,143 520,62 700,143" fill="#687a72" />
              <polygon points="261,62 305,36 350,62 326,58 307,48 288,58" fill="#bec0ae" />
            </>
          ) : (
            <>
              <rect x="0" y="91" width="164" height="92" fill={palette.structure} />
              <rect x="0" y="83" width="164" height="8" fill="#7d8584" />
              <rect x="18" y="108" width="24" height="18" fill={palette.light} />
              <rect x="57" y="108" width="24" height="18" fill="#333d49" />
              <rect x="98" y="108" width="24" height="18" fill={palette.light} />
              <rect x="18" y="143" width="24" height="18" fill="#333d49" />
              <rect x="57" y="143" width="24" height="18" fill={palette.light} />
              <rect x="98" y="143" width="24" height="18" fill="#333d49" />
            </>
          )}
          <rect x="0" y="178" width="760" height="46" fill={palette.ground} />
          <rect x="0" y="178" width="760" height="4" fill="#788078" opacity=".75" />
          <rect x="554" y="30" width="34" height="34" fill="#d9b86d" />
          <rect x="561" y="37" width="20" height="20" fill="#ead49a" />
          <rect x="75" y="39" width="3" height="3" fill="#d8d1bf" />
          <rect x="221" y="26" width="3" height="3" fill="#d8d1bf" />
          <rect x="677" y="70" width="3" height="3" fill="#d8d1bf" />
          {familyHome ? (
            <>
              <rect x="480" y="119" width="112" height="60" fill="#72624e" />
              <polygon points="468,120 536,79 604,120" fill="#786553" />
              <rect x="495" y="136" width="21" height="17" fill="#e0ba73" />
              <rect x="550" y="136" width="21" height="17" fill="#34434a" />
            </>
          ) : (
            <>
              <rect x="487" y="104" width="105" height="75" fill={palette.structure} />
              <rect x="500" y="119" width="23" height="18" fill={palette.light} />
              <rect x="538" y="119" width="23" height="18" fill="#34414b" />
              <rect x="500" y="148" width="23" height="18" fill="#34414b" />
              <rect x="538" y="148" width="23" height="18" fill={palette.light} />
            </>
          )}
          <g transform={`translate(370 ${figureTop})`}>
            <rect x="4" y="0" width="14" height="13" fill="#bb8c6c" />
            <rect x="3" y="0" width="15" height="4" fill="#322e31" />
            <rect x="1" y="10" width="20" height="18" fill={clothing} />
            <rect x="-3" y="12" width="5" height="14" fill="#bb8c6c" />
            <rect x="20" y="12" width="5" height="14" fill="#bb8c6c" />
            <rect x="4" y="27" width="6" height="13" fill="#303943" />
            <rect x="13" y="27" width="6" height="13" fill="#303943" />
          </g>
          <rect x="345" y="180" width="63" height="2" fill="#10171b" opacity=".65" />
        </svg>
        <div className="nr-scene-label">
          <span className="nr-scene-pin"><MapPin size={12} /></span>
          <span>{region} · {country}</span>
          <span className="nr-scene-time">{environment}</span>
        </div>
        <div className="nr-scene-caption">{caption}</div>
      </div>
    </ExperienceStage>
  );
}
