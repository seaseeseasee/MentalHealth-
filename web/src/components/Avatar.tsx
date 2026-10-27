export interface AvatarConfig {
  skin: string;
  hair: 'short' | 'bob' | 'bun' | 'curly';
  hairColor: string;
  outfit: 'hoodie' | 'sweater' | 'scrubs';
  glasses: boolean;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: '#F5C9A6',
  hair: 'bob',
  hairColor: '#4A3228',
  outfit: 'sweater',
  glasses: false
};

const OUTFIT_COLORS = { hoodie: '#9ED9BF', sweater: '#C9B8F0', scrubs: '#8FCFDA' };
const INK = '#3A2E2A';

interface Props {
  config?: AvatarConfig;
  mood?: 'happy' | 'calm';
  size?: number;
  bg?: string;
  label?: string;
}

/** The hand-drawn companion character, assembled from layered SVG parts. */
export function Avatar({ config = DEFAULT_AVATAR, mood = 'happy', size = 120, bg = 'transparent', label }: Props) {
  const { skin, hair, hairColor, outfit, glasses } = { ...DEFAULT_AVATAR, ...config };
  const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const };
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: bg, flexShrink: 0 }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <g fill={hairColor} {...line}>
          {hair === 'bob' && <path d="M52 96 C48 50 76 36 100 36 C124 36 152 50 148 96 L150 130 C140 136 128 134 122 128 L78 128 C72 134 60 136 50 130 Z" />}
          {hair === 'curly' && (
            <g>
              <circle cx="62" cy="74" r="16" /><circle cx="70" cy="52" r="17" /><circle cx="90" cy="40" r="17" />
              <circle cx="112" cy="39" r="17" /><circle cx="132" cy="50" r="17" /><circle cx="140" cy="74" r="16" />
            </g>
          )}
          {hair === 'bun' && <circle cx="100" cy="40" r="17" />}
        </g>
        <rect x="89" y="114" width="22" height="30" rx="8" fill={skin} {...line} />
        <path d="M36 204 C38 158 68 138 100 138 C132 138 162 158 164 204 Z" fill={OUTFIT_COLORS[outfit]} {...line} />
        <g fill="none" {...line} strokeLinecap="round">
          {outfit === 'hoodie' && <><path d="M80 142 C86 158 114 158 120 142" /><path d="M92 154 v18 M108 154 v18" /></>}
          {outfit === 'sweater' && <><path d="M82 141 C90 154 110 154 118 141" /><path d="M54 182 C82 175 118 175 146 182" strokeDasharray="2 7" /></>}
          {outfit === 'scrubs' && <><path d="M86 139 L100 161 L114 139" fill={skin} /><rect x="120" y="170" width="20" height="14" rx="3" /></>}
        </g>
        <g fill={skin} {...line}>
          <circle cx="58" cy="94" r="8" /><circle cx="142" cy="94" r="8" />
          <circle cx="100" cy="90" r="42" />
        </g>
        <g fill={hairColor} {...line}>
          {(hair === 'short' || hair === 'bun') && <path d="M58 86 C54 50 82 40 102 42 C128 44 148 58 142 86 C130 70 112 62 96 66 C82 70 70 76 58 86 Z" />}
          {hair === 'bob' && <path d="M58 92 C54 52 80 40 100 40 C124 40 148 54 142 94 C128 74 108 68 100 60 C92 72 74 82 58 92 Z" />}
          {hair === 'curly' && <path d="M60 80 C64 58 82 50 100 52 C120 52 138 60 140 80 C128 68 112 64 100 66 C86 66 72 70 60 80 Z" />}
        </g>
        <circle cx="76" cy="106" r="7" fill="#FF9E86" opacity="0.5" />
        <circle cx="124" cy="106" r="7" fill="#FF9E86" opacity="0.5" />
        {mood === 'happy' ? (
          <g fill={INK}><circle cx="86" cy="94" r="4" /><circle cx="114" cy="94" r="4" /></g>
        ) : (
          <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round"><path d="M80 94 q6 5 12 0" /><path d="M108 94 q6 5 12 0" /></g>
        )}
        <path d="M92 108 q8 8 16 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        {glasses && (
          <g fill="none" stroke={INK} strokeWidth="2.5"><circle cx="86" cy="94" r="11" /><circle cx="114" cy="94" r="11" /><path d="M97 94 h6" /></g>
        )}
      </svg>
    </div>
  );
}
