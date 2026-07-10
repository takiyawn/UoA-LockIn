import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export const lightTheme = {
  dark: false,
  bg: '#F7F5EF',
  card: '#FFFFFF',
  text: '#17161F',
  sub: '#726F7E',
  tag: '#EFEBE1',
  tagText: '#3A3745',
  border: '#E8E4DA',
  input: '#FFFFFF',
  tabBar: '#FFFFFF',
  accent: '#5B4FE9',
  accent2: '#7A6FF5',
  amber: '#C3831E',
  red: '#C4453F',
  redSoft: '#FBE7E5',
  green: '#1F8A5B',
  greenSoft: '#E4F3EC',
};

export const darkTheme = {
  dark: true,
  bg: '#131320',
  card: '#1E1D2C',
  text: '#F5F3EE',
  sub: '#9A97A8',
  tag: '#29283B',
  tagText: '#C7C4D6',
  border: '#2E2C40',
  input: '#1E1D2C',
  tabBar: '#1E1D2C',
  accent: '#7A6FF5',
  accent2: '#9186F7',
  amber: '#E8B45C',
  red: '#E9827C',
  redSoft: '#3A2224',
  green: '#63C99A',
  greenSoft: '#1C3329',
};

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const theme = dark ? darkTheme : lightTheme;
  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
