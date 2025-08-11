import React from 'react';
import { Sun, Moon } from 'lucide-react';

// Props para o componente de alternância de tema
interface ThemeToggleProps {
  isLightTheme: boolean;
  onToggle: () => void;
  className?: string;
}

// Componente de toggle igual ao print - com ícones e design moderno
const ThemeToggle = ({ isLightTheme, onToggle, className = "" }: ThemeToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-8 w-16 cursor-pointer items-center rounded-full transition-all duration-300 ${
        isLightTheme 
          ? 'bg-gray-200' // Tema claro - fundo cinza claro
          : 'bg-gray-800' // Tema escuro - fundo escuro
      } ${className}`}
    >
      {/* Ícone do sol (lado esquerdo) */}
      <Sun 
        className={`absolute left-2 h-4 w-4 transition-opacity duration-300 ${
          isLightTheme ? 'text-orange-500 opacity-100' : 'text-gray-500 opacity-50'
        }`} 
      />
      
      {/* Ícone da lua (lado direito) */}
      <Moon 
        className={`absolute right-2 h-4 w-4 transition-opacity duration-300 ${
          !isLightTheme ? 'text-gray-300 opacity-100' : 'text-gray-400 opacity-50'
        }`} 
      />
      
      {/* Círculo deslizante */}
      <div 
        className={`relative inline-block h-6 w-6 rounded-full shadow-lg transition-transform duration-300 ${
          isLightTheme 
            ? 'translate-x-8 bg-white' // Posição direita - bolinha branca no tema claro
            : 'translate-x-1 bg-white' // Posição esquerda - bolinha branca no tema escuro
        }`}
      />
    </button>
  );
};

export default ThemeToggle;