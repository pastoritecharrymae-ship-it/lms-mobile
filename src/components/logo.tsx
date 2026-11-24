import Svg, { Path } from 'react-native-svg';

export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34">
      <Path d="M3 5l12 3v21L3 26z" fill="#bfdcff" />
      <Path d="M31 5L19 8v21l12-3z" fill="#4aa3ff" />
      <Path d="M15 8h4v21h-4z" fill="#2f7bd1" />
    </Svg>
  );
}