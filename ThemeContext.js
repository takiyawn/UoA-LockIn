import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export const lightTheme = {
  dark: false,
  bg: '#f2f2f7',
  card: '#fff',
  text: '#000',
  sub: '#666',
  tag: '#f0f0f0',
  tagText: '#333',
  border: '#ddd',
  input: '#fff',
  tabBar: '#fff',
};

export const darkTheme = {
  dark: true,
  bg: '#121212',
  card: '#1c1c1e',
  text: '#fff',
  sub: '#999',
  tag: '#2c2c2e',
  tagText: '#ccc',
  border: '#333',
  input: '#1c1c1e',
  tabBar: '#1c1c1e',
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