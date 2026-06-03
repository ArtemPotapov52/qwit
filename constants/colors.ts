import { ViewStyle } from 'react-native';

export const Colors = {
  page: '#FAFAF8',
  surface: '#FFFFFF',
  ink: '#101114',
  sub: '#6A6C74',
  faint: '#AFB2BA',
  line: 'rgba(0,0,0,0.08)',
  hairline: 'rgba(0,0,0,0.06)',
  accent: '#2F5BEA',
  accentInk: '#FFFFFF',
  accentSoft: '#EAEFFE',
  accentSub: 'rgba(255,255,255,0.82)',
  accentLine: 'rgba(255,255,255,0.24)',
  pos: '#0E9F6E',
  neg: '#EE4D45',
} as const;

export const Shadows = {
  card: {
    shadowColor: '#101114',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  } as ViewStyle,
  hero: {
    shadowColor: '#2F5BEA',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    elevation: 10,
  } as ViewStyle,
};

export const CAT_META = {
  home:  { bg: '#E8EEFE', ink: '#3358E0', label: 'Жильё' },
  plane: { bg: '#E0F4F0', ink: '#0E9A82', label: 'Поездки' },
  bowl:  { bg: '#FBEFD7', ink: '#C9820E', label: 'Еда' },
  gift:  { bg: '#FBE6F0', ink: '#CE3C82', label: 'Подарки' },
  cart:  { bg: '#EAF6E8', ink: '#3E9B43', label: 'Продукты' },
  car:   { bg: '#EEEAFB', ink: '#6E4FD0', label: 'Транспорт' },
} as const;

export type CatKey = keyof typeof CAT_META;
