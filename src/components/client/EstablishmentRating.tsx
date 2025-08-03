import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EstablishmentRatingProps {
  ownerId: string;
  clientId: string;
  onRatingSubmitted?: () => void;
}

const EstablishmentRating = ({ ownerId, clientId, onRatingSubmitted }: EstablishmentRatingProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkExistingRating = async () => {
      if (!clientId || !ownerId) return;

      try {
        const { data, error } = await supabase
          .from('avaliacoes')
          .select('*')
          .eq('user_id', ownerId)
          .eq('cliente_id', clientId)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar avaliação existente:', error);
          return;
        }

        if (data) {
          setHasRated(true);
          setExistingRating(data);
          setRating(data.nota);
          setComment(data.comentario || '');
        }
      } catch (error) {
        console.error('Erro ao verificar avaliação:', error);
      }
    };

    checkExistingRating();
  }, [clientId, ownerId]);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma avaliação de 1 a 5 estrelas.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const ratingData = {
        user_id: ownerId,
        cliente_id: clientId,
        nota: rating,
        comentario: comment.trim() || null
      };

      if (hasRated && existingRating) {
        // Atualizar avaliação existente
        const { error } = await supabase
          .from('avaliacoes')
          .update(ratingData)
          .eq('id', existingRating.id);

        if (error) throw error;

        toast({
          title: "Avaliação atualizada!",
          description: "Sua avaliação foi atualizada com sucesso."
        });
      } else {
        // Criar nova avaliação
        const { error } = await supabase
          .from('avaliacoes')
          .insert(ratingData);

        if (error) throw error;

        setHasRated(true);
        toast({
          title: "Avaliação enviada!",
          description: "Obrigado por avaliar este estabelecimento."
        });
      }

      if (onRatingSubmitted) {
        onRatingSubmitted();
      }

      // Disparar refresh do header do estabelecimento
      window.postMessage({ type: 'REFRESH_ESTABLISHMENT_HEADER', ownerId }, '*');
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua avaliação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {hasRated ? 'Sua Avaliação' : 'Avaliar Estabelecimento'}
        </h3>
        
        {/* Seleção de estrelas */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">
            {hasRated ? 'Sua nota:' : 'Clique nas estrelas para avaliar:'}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-colors hover:scale-110"
                disabled={loading}
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-400 hover:text-yellow-400'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-yellow-400 mt-1">
              {rating === 1 && "Muito insatisfeito"}
              {rating === 2 && "Insatisfeito"}
              {rating === 3 && "Regular"}
              {rating === 4 && "Satisfeito"}
              {rating === 5 && "Muito satisfeito"}
            </p>
          )}
        </div>

        {/* Comentário */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Comentário (opcional):
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte-nos sobre sua experiência..."
            className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none"
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Botão de envio */}
        <Button
          onClick={handleSubmitRating}
          disabled={loading || rating === 0}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
        >
          {loading ? 'Enviando...' : hasRated ? 'Atualizar Avaliação' : 'Enviar Avaliação'}
        </Button>

        {hasRated && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Você já avaliou este estabelecimento. Pode atualizar sua avaliação a qualquer momento.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EstablishmentRating;