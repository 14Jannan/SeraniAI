import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check local storage or default to 'light'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove old class and add new one
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Save to local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);