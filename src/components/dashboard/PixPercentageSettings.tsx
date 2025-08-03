
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Percent, Save } from 'lucide-react';

const PixPercentageSettings = () => {
  const [percentualAntecipado, setPercentualAntecipado] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const percentageOptions = [
    { value: 10, label: '10%' },
    { value: 20, label: '20%' },
    { value: 30, label: '30%' },
    { value: 40, label: '40%' },
    { value: 50, label: '50%' },
    { value: 100, label: '100%' }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchCurrentPercentage();
    }
  }, [user?.id]);

  const fetchCurrentPercentage = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('🔍 Buscando configuração atual da porcentagem PIX...');

      const { data, error } = await supabase
        .from('configuracoes')
        .select('percentual_antecipado')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar configuração:', error);
        throw error;
      }

      if (data) {
        setPercentualAntecipado(data.percentual_antecipado || 50);
        console.log('✅ Porcentagem atual:', data.percentual_antecipado || 50);
      } else {
        console.log('ℹ️ Nenhuma configuração encontrada, usando padrão 50%');
        setPercentualAntecipado(50);
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a configuração atual.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePercentage = async () => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Salvando nova porcentagem:', percentualAntecipado);

      const { data, error } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user.id,
          percentual_antecipado: percentualAntecipado,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        throw error;
      }

      console.log('✅ Porcentagem PIX atualizada com sucesso:', data);
      
      toast({
        title: "Configuração salva! ✅",
        description: `Porcentagem PIX alterada para ${percentualAntecipado}%`
      });

    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar a configuração: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-700 rounded w-1/3"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-gold-400" />
          <h5 className="text-base text-gold-400">
            Porcentagem PIX Antecipado
          </h5>  
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="space-y-3">
          <Select 
            value={percentualAntecipado.toString()} 
            onValueChange={(value) => setPercentualAntecipado(parseInt(value))}
          >
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {percentageOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value.toString()}
                  className="text-white hover:bg-gray-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-gray-800 p-3 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>Exemplo:</strong> Para um serviço de R$ 100,00 com {percentualAntecipado}% antecipado:
          </p>
          <ul className="text-sm text-gray-400 mt-2 space-y-1">
            <li>• PIX antecipado: R$ {(100 * percentualAntecipado / 100).toFixed(2)}</li>
            <li>• Pagamento presencial: R$ {(100 * (100 - percentualAntecipado) / 100).toFixed(2)}</li>
          </ul>
        </div>

        <Button
          onClick={handleSavePercentage}
          disabled={saving}
          className="w-full bg-gradient-to-r from-gold-400 to-gold-600 text-black font-semibold hover:opacity-90"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PixPercentageSettings;
