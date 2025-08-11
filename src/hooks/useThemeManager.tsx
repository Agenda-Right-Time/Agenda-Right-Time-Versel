import React, { createContext, useContext, useState, useEffect } from 'react';

// Interface unificada para o contexto do tema global
interface GlobalThemeContextType {
  isLightTheme: boolean;
  toggleTheme: () => void;
}

// Contexto global unificado que funciona em toda a aplicação
const GlobalThemeContext = createContext<GlobalThemeContextType>({
  isLightTheme: false,
  toggleTheme: () => {}
});

// Provider global unificado - funciona em toda a aplicação
export const GlobalThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Estado do tema - começa como tema escuro (false = escuro, true = claro)
  const [isLightTheme, setIsLightTheme] = useState(false);

  // Carrega o tema salvo no localStorage na inicialização
  useEffect(() => {
    const savedTheme = localStorage.getItem('global-theme');
    if (savedTheme === 'light') {
      setIsLightTheme(true);
    }
  }, []);

  // Função para alternar entre tema claro e escuro
  const toggleTheme = () => {
    const newTheme = !isLightTheme;
    setIsLightTheme(newTheme);
    // Salva a preferência no localStorage
    localStorage.setItem('global-theme', newTheme ? 'light' : 'dark');
  };

  return (
    <GlobalThemeContext.Provider value={{ isLightTheme, toggleTheme }}>
      {children}
    </GlobalThemeContext.Provider>
  );
};

// Hook global unificado - funciona em qualquer lugar da aplicação
export const useTheme = () => {
  return useContext(GlobalThemeContext);
};