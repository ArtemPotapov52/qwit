import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { CatKey } from '@/constants/colors';

interface Props { cat: CatKey; color: string; size?: number }

export function CatIcon({ cat, color, size = 22 }: Props) {
  const props = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (cat === 'home') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G {...props}>
        <Path d="M3 10.6 L12 3.5 L21 10.6"/>
        <Path d="M5.4 9 V20.5 H18.6 V9"/>
        <Path d="M9.6 20.5 V14 H14.4 V20.5"/>
      </G>
    </Svg>
  );
  if (cat === 'plane') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...props} d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </Svg>
  );
  if (cat === 'bowl') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G {...props}>
        <Path d="M4.5 11 H19.5 a7.5 7.5 0 0 1 -15 0 Z"/>
        <Path d="M8 3.6 q-1 1.6 0 3.2 M12 3.4 q-1 1.6 0 3.2 M16 3.6 q-1 1.6 0 3.2"/>
      </G>
    </Svg>
  );
  if (cat === 'cart') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G {...props}>
        <Path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L20 7H6"/>
        <Circle cx="9.5" cy="20" r="1.3"/>
        <Circle cx="17.5" cy="20" r="1.3"/>
      </G>
    </Svg>
  );
  if (cat === 'car') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G {...props}>
        <Path d="M3 13.5l1.8-5A2 2 0 0 1 6.7 7h10.6a2 2 0 0 1 1.9 1.5l1.8 5"/>
        <Path d="M3 13.5h18V18a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
        <Path d="M6.5 16h.01M17.5 16h.01"/>
      </G>
    </Svg>
  );
  // gift (default)
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G {...props}>
        <Path d="M20 11.5 V20.5 H4 V11.5"/>
        <Path d="M2.5 7.5 H21.5 V11.5 H2.5 Z"/>
        <Path d="M12 7.5 V20.5"/>
        <Path d="M12 7.5 C12 4.8 8.2 4.8 8.2 7 C8.2 8.6 10 8 12 7.5 M12 7.5 C12 4.8 15.8 4.8 15.8 7 C15.8 8.6 14 8 12 7.5"/>
      </G>
    </Svg>
  );
}
