import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { useTheme } from '@/hooks/useThemeManager';

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  foto_url?: string;
}

interface ProfissionalSelectorProps {
  profissionais: Profissional[];
  selectedProfissional: string;
  onSelectProfissional: (profissionalId: string) => void;
}

const ProfissionalSelector: React.FC<ProfissionalSelectorProps> = ({
  profissionais,
  selectedProfissional,
  onSelectProfissional
}) => {
const { isLightTheme } = useTheme(); 

  return (
    <Card className={`${isLightTheme ? 'bg-gray-300 border-gold-800' : 'bg-gray-900 border-gray-700'}`}>



      <CardHeader>
        <CardTitle className={`${isLightTheme ? 'text-black' : 'text-white'} flex items-center gap-2`}>
          <User className="text-yellow-600 h-5 w-5" />
          Selecione o Profissional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {profissionais.map((profissional) => (
          <Button
            key={profissional.id}
            variant={selectedProfissional === profissional.id ? "default" : "outline"}
            onClick={() => onSelectProfissional(profissional.id)}
            className={`w-full justify-start p-4 h-auto ${
              selectedProfissional === profissional.id 
                ? 'border-white bg-gray-600'
                : 'bg-gray-800 text-white border-gray-700 hover:bg-gray-600 hover:border-white '
            }`}
          >
            <div className="flex items-center gap-3">
              {profissional.foto_url ? (
                <img
                  src={profissional.foto_url}
                  alt={profissional.nome}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-300" />
                </div>
              )}
              <div className="text-left">
                <div className="font-medium">{profissional.nome}</div>
                {profissional.especialidade && (
                  <div className="text-sm opacity-70">{profissional.especialidade}</div>
                )}
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProfissionalSelector;
