
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Cliente {
  nome: string;
  telefone: string;
  email: string;
}

interface ClienteFormProps {
  cliente: Cliente;
  onClienteChange: (cliente: Cliente) => void;
  observacoes: string;
  onObservacoesChange: (observacoes: string) => void;
  isClientLoggedIn?: boolean;
}

const ClienteForm: React.FC<ClienteFormProps> = ({
  cliente,
  onClienteChange,
  observacoes,
  onObservacoesChange,
  isClientLoggedIn = false
}) => {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">
          Seus Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            value={cliente.nome}
            onChange={(e) => onClienteChange({ ...cliente, nome: e.target.value })}
            className="bg-gray-800 border-gray-600"
            placeholder="Seu nome completo"
            disabled={isClientLoggedIn}
          />
        </div>

        <div>
          <Label htmlFor="telefone">Telefone *</Label>
          <Input
            id="telefone"
            value={cliente.telefone}
            onChange={(e) => onClienteChange({ ...cliente, telefone: e.target.value })}
            className="bg-gray-800 border-gray-600"
            placeholder="(11) 99999-9999"
            disabled={isClientLoggedIn}
          />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={cliente.email}
            onChange={(e) => onClienteChange({ ...cliente, email: e.target.value })}
            className="bg-gray-800 border-gray-600"
            placeholder="seu@email.com"
            disabled={isClientLoggedIn}
          />
        </div>

        <div>
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => onObservacoesChange(e.target.value)}
            className="bg-gray-800 border-gray-600"
            placeholder="Alguma observação especial?"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteForm;
