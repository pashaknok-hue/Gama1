import { sceneFor, avatarGeometry, SCENE_FLOOR } from '../../game/scene-state';
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
        <section
          className="nr-special-stage"
          aria-label={experience.kind === 'cutscene' ? 'Особая сцена' : 'Мини-игра'}
        >
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
  if (!character) return null;
  const region = life?.location.region ?? profile?.region,
    country = life?.location.country ?? profile?.country;
  const scene = sceneFor(life),
    age = life?.age ?? 0,
    avatar = avatarGeometry(age);
  const indoor = ['home', 'school', 'workshop', 'studio'].includes(scene.kind);
  return (
    <ExperienceStage>
      <div
        className="nr-scene nr-life-scene"
        data-scene={scene.kind}
        aria-label={`${character.name}: ${scene.title}`}
      >
        <svg
          className="nr-scene-art"
          viewBox="0 0 760 224"
          role="img"
          aria-label={`Пиксельная сцена: ${scene.title}`}
          shapeRendering="crispEdges"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect width="760" height="224" fill="#243840" />
          <path
            d="M0 25H760M0 49H760M0 73H760M0 97H760M0 121H760M0 145H760"
            stroke="#30484e"
            strokeWidth="1"
          />
          <path
            d="M80 0V178M160 0V178M240 0V178M320 0V178M400 0V178M480 0V178M560 0V178M640 0V178M720 0V178"
            stroke="#30484e"
          />
          <rect x="68" y="42" width="624" height="136" fill={indoor ? '#788477' : '#527873'} />
          <rect x="68" y="42" width="8" height="136" fill="#d2c199" />
          <rect x="684" y="42" width="8" height="136" fill="#c0664b" />
          <rect x="82" y="54" width="130" height="80" fill="#b4c6b7" />
          <path d="M147 54V134M82 94H212" stroke="#3e6265" strokeWidth="6" />
          <rect y={SCENE_FLOOR} width="760" height="46" fill="#667261" data-testid="scene-floor" />
          <path d="M0 179H760" stroke="#decba0" strokeWidth="2" />
          {[90, 180, 270, 360, 450, 540, 630, 720].map((x) => (
            <path key={x} d={`M${x} 180l-30 44`} stroke="#4d655e" strokeWidth="2" />
          ))}
          {scene.kind === 'home' && (
            <g>
              <rect x="490" y="112" width="115" height="48" fill="#b8795e" />
              <rect x="490" y="156" width="8" height="22" fill="#3a4742" />
              <rect x="597" y="156" width="8" height="22" fill="#3a4742" />
              <rect x="510" y="100" width="18" height="18" fill="#dcc79d" />
              <rect x="544" y="115" width="42" height="4" fill="#718e7d" />
            </g>
          )}
          {scene.kind === 'school' && (
            <g>
              <rect x="465" y="63" width="145" height="50" fill="#294f50" />
              <path d="M475 77h80M475 92h110" stroke="#cbd5aa" strokeWidth="3" />
              <rect x="485" y="132" width="100" height="9" fill="#d1ae78" />
              <path d="M493 141v37M577 141v37" stroke="#394e49" strokeWidth="7" />
              <rect x="510" y="126" width="38" height="6" fill="#d97750" />
            </g>
          )}
          {scene.kind === 'workshop' && (
            <g>
              <rect x="470" y="127" width="150" height="12" fill="#c49762" />
              <path d="M480 139v39M610 139v39" stroke="#345654" strokeWidth="8" />
              <rect x="492" y="85" width="48" height="40" fill="#314952" />
              <rect x="498" y="91" width="36" height="25" fill="#96bca3" />
              <rect x="554" y="117" width="32" height="10" fill="#cf6549" />
            </g>
          )}
          {scene.kind === 'studio' && (
            <g>
              <path d="M520 110l-28 68M520 110l32 68" stroke="#bf9568" strokeWidth="6" />
              <rect x="485" y="75" width="75" height="64" fill="#e4d0a5" />
              <path d="M495 122l15-18 17 9 20-27" stroke="#ba6048" strokeWidth="7" />
            </g>
          )}
          {['yard', 'garden'].includes(scene.kind) && (
            <g>
              <rect x="480" y="121" width="130" height="11" fill="#c8a36b" />
              <path d="M490 132v46M600 132v46" stroke="#384d48" strokeWidth="7" />
              <rect x="560" y="72" width="10" height="49" fill="#6e5f46" />
              <rect x="542" y="55" width="46" height="32" fill="#9bac78" />
              {scene.kind === 'yard' && (
                <g>
                  <rect x="275" y="165" width="20" height="13" fill="#d77651" />
                  <rect x="296" y="153" width="15" height="25" fill="#c8b47d" />
                </g>
              )}
            </g>
          )}
          <ellipse cx="385" cy="181" rx="27" ry="3" fill="#24383a" opacity=".6" />
          <g
            data-testid="scene-avatar"
            data-support-y={avatar.feet}
            transform={`translate(370 ${avatar.top}) scale(${avatar.scale})`}
          >
            {age < 1 ? (
              <g>
                <rect x="-3" y="19" width="30" height="5" fill="#d0ae7d" />
                <rect
                  data-testid="scene-support"
                  x="-2"
                  y="24"
                  width="4"
                  height="16"
                  fill="#765e47"
                />
                <rect x="22" y="24" width="4" height="16" fill="#765e47" />
                <rect x="12" y="9" width="10" height="10" fill="#d0a17e" />
                <rect x="0" y="14" width="16" height="5" fill="#9eb89f" />
              </g>
            ) : (
              <g>
                <rect x="5" y="0" width="12" height="12" fill="#c89b79" />
                <rect x="4" y="0" width="14" height="4" fill="#35363d" />
                <rect x="15" y="6" width="2" height="2" fill="#273841" />
                <rect x="2" y="12" width="18" height="16" fill="#c26b50" />
                <rect x="2" y="19" width="18" height="4" fill="#d3c596" />
                <rect x="-2" y="13" width="4" height="15" fill="#c89b79" />
                <rect x="20" y="13" width="4" height="15" fill="#c89b79" />
                <rect x="5" y="28" width="5" height="12" fill="#2e4c52" />
                <rect
                  data-testid="scene-support"
                  x="13"
                  y="28"
                  width="5"
                  height="12"
                  fill="#2e4c52"
                />
              </g>
            )}
          </g>
        </svg>
        <div className="nr-scene-label">
          <span className="nr-scene-pin">
            <MapPin size={12} />
          </span>
          <span>
            {region} · {country}
          </span>
          <span className="nr-scene-time">{scene.title}</span>
        </div>
        <div className="nr-scene-caption">{scene.detail}</div>
      </div>
    </ExperienceStage>
  );
}
