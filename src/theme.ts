// Dark, glowing palette taken from the tree concept chart.

export const colors = {
  background: '#05070B',
  surface: '#0B1017',
  surfaceRaised: '#111924',
  border: '#1C2735',
  text: '#EAF2F8',
  textMuted: '#93A6B8',
  textFaint: '#5B6D80',
  accent: '#3DDC97',
  danger: '#FF5C7A',
  warning: '#FFC857',
};

/** One color per top-level group, as in the concept chart. */
export const groupColors: Record<string, string> = {
  animals: '#EAF2F8',
  mammals: '#3DDC97',
  birds: '#FF8A3D',
  reptiles: '#FF4D8D',
  amphibians: '#B6F03C',
  fish: '#2EC5FF',
  insects: '#FFD23F',
  arachnids: '#B47CFF',
  invertebrates: '#7C8CFF',
};

export function groupColor(groupId: string | undefined): string {
  return (groupId && groupColors[groupId]) || colors.accent;
}

/** Blend two #RRGGBB colors; t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };
