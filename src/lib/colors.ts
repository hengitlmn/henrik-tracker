export const HABIT_COLORS = [
  { name: 'Blue', value: '#6F85FF' },
  { name: 'Green', value: '#4CC38A' },
  { name: 'Yellow', value: '#F5B84B' },
  { name: 'Red', value: '#F2786B' },
  { name: 'Pink', value: '#F472B6' },
  { name: 'Purple', value: '#C084FC' },
  { name: 'White', value: '#F2F2F0' },
] as const;

export const DEFAULT_COLOR = HABIT_COLORS[0].value;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Gibt die Farbe zurück, wenn sie ein gültiger Hex-Wert ist, sonst undefined. */
export function validColor(c: unknown): string | undefined {
  return typeof c === 'string' && HEX.test(c) ? c : undefined;
}
