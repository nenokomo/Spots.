export const colors = {
  background: '#100b15',
  gradient: ['#120d1c', '#281326', '#3d1a32'] as const,
  panelGradient: ['#211329', '#3a1b32'] as const,
  accent: '#c922ab',
  pink: '#ff4ab8',
  text: '#fff6ff',
  muted: '#d4bcd8',
  border: '#ffffff18',
  surface: '#25172d',
};

export const categories = ['Alle', 'Techno', 'House', 'Party', 'Clubs'] as const;
export type Category = (typeof categories)[number];
