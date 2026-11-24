import Svg, { Circle, Rect, Polygon, Path, Line, G } from 'react-native-svg';

const TEAL = '#7fd6c8';
const CREAM = '#f6ede0';
const NAVY = '#2d3a6b';
const GOLD = '#f7b53b';
const CORAL = '#ef6a5a';

export default function LoginArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 420 310">
      {/* small decorations */}
      <Circle cx={76} cy={40} r={6} fill={TEAL} />
      <Circle cx={399} cy={162} r={6} fill={TEAL} />
      <Circle cx={132} cy={285} r={5} fill="#ef8f80" />
      <Polygon points="392,62 412,62 402,80" fill="none" stroke={TEAL} strokeWidth={3} />
      <Polygon points="44,98 44,116 62,107" fill="none" stroke="#ef8f80" strokeWidth={3} />

      {/* play circle */}
      <Circle cx={115} cy={73} r={34} fill={TEAL} />
      <Circle cx={115} cy={73} r={27} fill="#e6f8f4" />
      <Polygon points="105,58 105,88 131,73" fill={TEAL} />

      {/* light bulb */}
      <Circle cx={282} cy={58} r={29} fill={GOLD} />
      <Rect x={270} y={82} width={24} height={16} rx={3} fill="#8f9bd0" />
      <Line x1={282} y1={4} x2={282} y2={17} stroke="#ef8f80" strokeWidth={3} strokeLinecap="round" />
      <Line x1={250} y1={20} x2={258} y2={29} stroke="#ef8f80" strokeWidth={3} strokeLinecap="round" />
      <Line x1={314} y1={20} x2={306} y2={29} stroke="#ef8f80" strokeWidth={3} strokeLinecap="round" />

      {/* pencil */}
      <Line x1={350} y1={140} x2={397} y2={84} stroke={TEAL} strokeWidth={14} strokeLinecap="round" />

      {/* video card */}
      <Rect x={12} y={140} width={111} height={77} rx={8} fill={CREAM} />
      <Circle cx={68} cy={179} r={18} fill={CORAL} />
      <Polygon points="62,169 62,189 78,179" fill="#fff" />
      <Polygon points="4,225 125,225 125,239 15,239" fill={TEAL} />

      {/* open book */}
      <Polygon points="121,165 232,190 232,298 121,247" fill={CREAM} />
      <Polygon points="232,190 343,165 343,247 232,298" fill={CREAM} />
      <Line x1={232} y1={190} x2={232} y2={298} stroke="#e0cdb5" strokeWidth={3} />
      <G stroke={TEAL} strokeWidth={5} strokeLinecap="round">
        <Line x1={142} y1={202} x2={212} y2={218} />
        <Line x1={142} y1={220} x2={212} y2={236} />
        <Line x1={142} y1={238} x2={212} y2={254} />
        <Line x1={252} y1={218} x2={322} y2={202} />
        <Line x1={252} y1={236} x2={322} y2={220} />
        <Line x1={252} y1={254} x2={322} y2={238} />
      </G>
      <Rect x={115} y={268} width={295} height={15} rx={3} fill={NAVY} />

      {/* graduation cap */}
      <Path d="M183 156 L183 178 Q232 198 281 178 L281 156 Z" fill="#3d4a85" />
      <Polygon points="144,134 232,107 321,134 232,171" fill={NAVY} />
      <Line x1={297} y1={144} x2={297} y2={185} stroke={GOLD} strokeWidth={3} />
      <Circle cx={297} cy={187} r={4} fill={GOLD} />

      {/* coin */}
      <Circle cx={98} cy={270} r={17} fill={GOLD} />
      <Circle cx={98} cy={270} r={11} fill="#f4a523" />

      {/* diploma ribbon + star */}
      <Line x1={342} y1={295} x2={405} y2={250} stroke="#ef8f80" strokeWidth={16} strokeLinecap="round" />
      <Polygon
        points="378,248 384,263 400,263 387,273 392,289 378,279 364,289 369,273 356,263 372,263"
        fill={GOLD}
      />
    </Svg>
  );
}