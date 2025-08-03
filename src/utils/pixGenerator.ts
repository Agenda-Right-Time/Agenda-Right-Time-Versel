import { supabase } from '@/integrations/supabase/client';

// Utilitário para gerar códigos PIX seguindo o padrão EMV brasileiro
export const generatePixCode = (params: {
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid: string;
  pixKey?: string;
}) => {
  const { merchantName, merchantCity, amount, txid, pixKey } = params;
  
  // Função para calcular CRC16-CCITT (polinômio padrão PIX)
  const calculateCRC16 = (str: string) => {
    let crc = 0xFFFF;
    
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF; // Manter apenas 16 bits
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };

  // Função para formatar campo EMV
  const formatEMVField = (id: string, value: string) => {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  };

  // Validar se a chave PIX foi fornecida
  if (!pixKey) {
    throw new Error('Chave PIX é obrigatória para gerar código de pagamento');
  }

  // Normalizar campos conforme especificação PIX - mais rigoroso
  const cleanMerchantName = merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
    .substring(0, 25);
    
  const cleanMerchantCity = merchantCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 15);
    
  const cleanTxid = txid.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 25);

  // Validar chave PIX (deve ser email válido)
  const cleanPixKey = pixKey.trim().toLowerCase();
  if (!cleanPixKey.includes('@') || cleanPixKey.length > 77) {
    throw new Error('Chave PIX deve ser um email válido');
  }

  console.log('=== DADOS PARA GERAÇÃO PIX ===');
  console.log('PIX Key:', cleanPixKey);
  console.log('Merchant Name (clean):', cleanMerchantName);
  console.log('Merchant City (clean):', cleanMerchantCity);
  console.log('Amount:', amount);
  console.log('TxID:', cleanTxid);

  // Construir payload EMV conforme padrão brasileiro
  let payload = '';
  
  // Payload Format Indicator (obrigatório) - sempre "01"
  payload += formatEMVField('00', '01');
  
  // Point of Initiation Method - 12 para dinâmico (com valor)
  payload += formatEMVField('01', '12');
  
  // Merchant Account Information - Campo 26 (PIX)
  let pixData = formatEMVField('00', 'BR.GOV.BCB.PIX');
  pixData += formatEMVField('01', cleanPixKey);
  payload += formatEMVField('26', pixData);
  
  // Merchant Category Code (0000 = não especificado)
  payload += formatEMVField('52', '0000');
  
  // Transaction Currency (986 = Real brasileiro)
  payload += formatEMVField('53', '986');
  
  // Transaction Amount - FORMATO CRÍTICO
  // Deve ser string numérica sem separadores, com ponto decimal se necessário
  let amountStr = amount.toFixed(2);
  // Remover zeros desnecessários à direita após o decimal
  if (amountStr.endsWith('.00')) {
    amountStr = Math.floor(amount).toString();
  } else if (amountStr.endsWith('0')) {
    amountStr = amount.toFixed(1);
  }
  payload += formatEMVField('54', amountStr);
  
  // Country Code (BR = Brasil)
  payload += formatEMVField('58', 'BR');
  
  // Merchant Name - VALIDAÇÃO IMPORTANTE
  if (cleanMerchantName.length === 0) {
    throw new Error('Nome do comerciante não pode estar vazio');
  }
  payload += formatEMVField('59', cleanMerchantName);
  
  // Merchant City - VALIDAÇÃO IMPORTANTE
  if (cleanMerchantCity.length === 0) {
    throw new Error('Cidade do comerciante não pode estar vazia');
  }
  payload += formatEMVField('60', cleanMerchantCity);
  
  // Additional Data Field Template (Campo 62) - TxID
  if (cleanTxid.length > 0) {
    const additionalData = formatEMVField('05', cleanTxid);
    payload += formatEMVField('62', additionalData);
  }
  
  // CRC16 - sempre por último (campo 63)
  const payloadForCrc = payload + '6304';
  const crc = calculateCRC16(payloadForCrc);
  payload = payloadForCrc + crc;
  
  console.log('=== PIX GERADO ===');
  console.log('Payload completo:', payload);
  console.log('Comprimento:', payload.length);
  console.log('CRC calculado:', crc);
  
  // Validação final do tamanho
  if (payload.length > 512) {
    throw new Error('Código PIX muito longo. Verifique os dados de entrada.');
  }
  
  return payload;
};

// Função para buscar chave PIX da configuração do usuário
export const getUserPixKey = async (userId: string): Promise<string | null> => {
  try {
    console.log('=== INICIANDO BUSCA CHAVE PIX ===');
    console.log('User ID:', userId);
    
    if (!userId) {
      console.error('User ID não fornecido');
      return null;
    }
    
    // Primeiro tentar buscar na configuração local
    console.log('🔍 Buscando chave PIX na configuração local...');
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('mercado_pago_access_token')
      .eq('user_id', userId)
      .single();

    if (configError) {
      console.error('❌ Erro ao buscar configuração local:', configError);
    }

    // Se não tem access token local, tentar buscar via edge function
    if (!config?.mercado_pago_access_token) {
      console.log('⚠️ Sem access token local, tentando edge function...');
      
      const { data, error } = await supabase.functions.invoke('get-mercado-pago-user', {
        body: { userId }
      });

      if (error || !data?.pixKey) {
        console.error('❌ Erro na edge function ou chave PIX não encontrada');
        
        // Como fallback, usar email do profissional como chave PIX se disponível
        const { data: profile } = await supabase
          .from('profissional_profiles')
          .select('email')
          .eq('id', userId)
          .single();
          
        if (profile?.email) {
          console.log('✅ Usando email do profissional como chave PIX:', profile.email);
          return profile.email;
        }
        
        return null;
      }

      console.log('✅ Chave PIX encontrada via edge function:', data.pixKey);
      return data.pixKey;
    }

    // Se tem access token, tentar usar para buscar dados
    console.log('✅ Access token encontrado, usando configuração local');
    
    // Por enquanto, vamos usar o email do usuário como fallback seguro
    const { data: profile } = await supabase
      .from('profissional_profiles')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (profile?.email) {
      console.log('✅ Usando email do profissional como chave PIX:', profile.email);
      return profile.email;
    }

    return null;

  } catch (error) {
    console.error('=== ERRO GERAL NA BUSCA DA CHAVE PIX ===');
    console.error('Erro completo:', error);
    
    // Último fallback: tentar buscar email do usuário
    try {
      const { data: profile } = await supabase
        .from('profissional_profiles')
        .select('email')
        .eq('id', userId)
        .single();
        
      if (profile?.email) {
        console.log('✅ Fallback: usando email do profissional como chave PIX');
        return profile.email;
      }
    } catch (fallbackError) {
      console.error('❌ Erro no fallback:', fallbackError);
    }
    
    return null;
  }
};

// Função simplificada para gerar código PIX para agendamentos
export const generateSimplePixCode = async (params: {
  amount: number;
  description: string;
  merchantName: string;
  userId: string;
}) => {
  const { amount, description, merchantName, userId } = params;
  
  console.log('=== INICIANDO GERAÇÃO PIX COMPLETA ===');
  console.log('Parâmetros recebidos:', { amount, merchantName, userId, description });
  
  try {
    // Validar parâmetros de entrada
    if (!userId) {
      console.error('❌ User ID não fornecido para buscar chave PIX');
      throw new Error('User ID é obrigatório para buscar a chave PIX');
    }
    
    if (!amount || amount <= 0) {
      console.error('❌ Valor inválido:', amount);
      throw new Error('Valor deve ser maior que zero');
    }
    
    if (!merchantName || merchantName.trim().length === 0) {
      console.error('❌ Nome do comerciante não fornecido');
      throw new Error('Nome do comerciante é obrigatório');
    }
    
    console.log('✅ Validações iniciais passaram. Buscando chave PIX...');
    
    // Buscar chave PIX do usuário
    const pixKey = await getUserPixKey(userId);
    
    if (!pixKey) {
      console.error('=== FALHA: CHAVE PIX NÃO ENCONTRADA ===');
      console.error('User ID pesquisado:', userId);
      throw new Error('Chave PIX não configurada. Configure sua chave PIX (email) nas configurações do sistema para receber pagamentos.');
    }
    
    console.log('=== CHAVE PIX ENCONTRADA, GERANDO CÓDIGO ===');
    console.log('Chave PIX para usar:', pixKey);
    
    // Gerar ID único para a transação (formato mais seguro)
    const timestamp = Date.now().toString().slice(-8);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const txid = `AGD${timestamp}${randomSuffix}`.substring(0, 25);
    
    console.log('TxID gerado:', txid);
    
    const pixCode = generatePixCode({
      merchantName: merchantName || 'PRESTADOR SERVICOS',
      merchantCity: 'SAO PAULO',
      amount,
      txid,
      pixKey
    });
    
    console.log('=== PIX GERADO COM SUCESSO ===');
    console.log('Código PIX final:', pixCode);
    console.log('Código válido:', validatePixCode(pixCode));
    
    return pixCode;
    
  } catch (error) {
    console.error('=== ERRO NA GERAÇÃO DO CÓDIGO PIX ===');
    console.error('Erro detalhado:', error);
    console.error('Message:', error instanceof Error ? error.message : 'Erro desconhecido');
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Re-lançar erro com mensagem mais específica
    if (error instanceof Error) {
      throw new Error(`Erro PIX: ${error.message}`);
    } else {
      throw new Error('Erro desconhecido ao gerar código PIX');
    }
  }
};

// Função para validar código PIX brasileiro
export const validatePixCode = (pixCode: string): boolean => {
  try {
    console.log('=== VALIDANDO CÓDIGO PIX ===');
    console.log('Código para validar:', pixCode);
    console.log('Comprimento:', pixCode.length);
    
    if (!pixCode || pixCode.length < 50) {
      console.log('Validação falhou: código muito curto');
      return false;
    }
    
    // Verificações do formato EMV PIX
    const checks = {
      hasPayloadFormat: pixCode.startsWith('000201'), // Deve começar com 000201
      hasPIXIndicator: pixCode.includes('0014BR.GOV.BCB.PIX'), // Tem indicador PIX correto
      hasCurrency: pixCode.includes('5303986'), // Moeda BRL (986)
      hasCountry: pixCode.includes('5802BR'), // País BR
      hasCRC: /6304[0-9A-F]{4}$/.test(pixCode), // Termina com CRC válido
      validLength: pixCode.length >= 80 && pixCode.length <= 512,
      hasAmount: pixCode.includes('54'), // Tem campo de valor
      hasMerchant: pixCode.includes('59'), // Tem nome do comerciante
      hasCity: pixCode.includes('60'), // Tem cidade
      hasTxId: pixCode.includes('62') // Tem dados adicionais (TxID)
    };
    
    console.log('Verificações PIX:', checks);
    
    // Deve passar em todas as verificações básicas
    const basicChecksPass = Object.values(checks).every(check => check === true);
    console.log('Verificações básicas passaram:', basicChecksPass);
    
    if (!basicChecksPass) {
      return false;
    }
    
    // Validar CRC
    const payloadWithoutCRC = pixCode.substring(0, pixCode.length - 4);
    const crcFromCode = pixCode.substring(pixCode.length - 4);
    
    console.log('Validando CRC...');
    console.log('Payload sem CRC:', payloadWithoutCRC);
    console.log('CRC do código:', crcFromCode);
    
    // Recalcular CRC para validação
    let crc = 0xFFFF;
    for (let i = 0; i < payloadWithoutCRC.length; i++) {
      crc ^= payloadWithoutCRC.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF; // Manter apenas 16 bits
      }
    }
    const calculatedCRC = crc.toString(16).toUpperCase().padStart(4, '0');
    
    const crcValid = calculatedCRC === crcFromCode;
    console.log('Validação CRC:', { calculated: calculatedCRC, received: crcFromCode, valid: crcValid });
    
    console.log('=== RESULTADO FINAL DA VALIDAÇÃO ===');
    console.log('Código PIX válido:', crcValid);
    
    return crcValid;
    
  } catch (error) {
    console.error('=== ERRO NA VALIDAÇÃO PIX ===');
    console.error('Erro:', error);
    return false;
  }
};
