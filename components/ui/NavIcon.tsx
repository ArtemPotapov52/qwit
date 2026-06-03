import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props { name: 'groups' | 'stats' | 'activity' | 'profile'; color: string; active?: boolean }

export function NavIcon({ name, color, active }: Props) {
  const sw = active ? 2.2 : 1.8;
  const p = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'groups') return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx="9" cy="9" r="3.2" {...p}/>
      <Circle cx="16.5" cy="10.5" r="2.6" {...p}/>
      <Path d="M3.5 19c0-2.8 2.3-4.6 5.5-4.6s5.5 1.8 5.5 4.6" {...p}/>
      <Path d="M15 14.6c2.6.1 5 1.6 5 4.4" {...p}/>
    </Svg>
  );
  if (name === 'stats') return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M5 20V11M12 20V5M19 20v-6" {...p}/>
    </Svg>
  );
  if (name === 'activity') return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M4 13h3l2-6 3 11 2.5-8 1.5 3h4" {...p}/>
    </Svg>
  );
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx="12" cy="8.5" r="3.4" {...p}/>
      <Path d="M5.5 19.5c.4-3.3 3-5 6.5-5s6.1 1.7 6.5 5" {...p}/>
    </Svg>
  );
}
