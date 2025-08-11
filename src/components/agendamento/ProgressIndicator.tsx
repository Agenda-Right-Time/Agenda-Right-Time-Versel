import React from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/hooks/useThemeManager';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  onBack
}) => {
  const steps = [
    { number: 1, label: 'Serviço' },
    { number: 2, label: 'Profissional' },
    { number: 3, label: 'Horário' },
    { number: 4, label: 'Confirmação' },
    { number: 5, label: 'Pagamento' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step.number} className="flex flex-col items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
              ${currentStep > step.number
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
                : currentStep === step.number
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
                : 'bg-gray-700 text-gray-400 border-2 border-gray-600'
              }
            `}>
              {currentStep > step.number ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span className={`
              mt-1 text-xs font-medium transition-colors duration-300 text-center
              ${currentStep >= step.number ? 'text-yellow-400' : 'text-gray-500'}
            `}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Back button */}
      {currentStep > 1 && onBack && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-400 transition-colors duration-300 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
