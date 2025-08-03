# 🚀 Configuração do Vercel - URGENTE

## ⚠️ TELA BRANCA? Configure as variáveis de ambiente!

Seu projeto está com tela branca porque faltam as **variáveis de ambiente do Supabase**.

## 🔧 COMO RESOLVER:

### 1. **Configure no Supabase Dashboard:**
1. Acesse [supabase.com](https://supabase.com)
2. Vá para seu projeto
3. Clique em **Settings** → **API**
4. Copie:
   - **Project URL**
   - **anon public key**

### 2. **Configure no Vercel Dashboard:**
1. Acesse [vercel.com](https://vercel.com)
2. Vá para seu projeto: **Agenda-Right-Time-Versel**
3. Clique em **Settings** → **Environment Variables**
4. Adicione estas variáveis:

```
VITE_SUPABASE_URL = sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY = sua_chave_anon_do_supabase
```

### 3. **Redeploy:**
1. Vá em **Deployments**
2. Clique nos 3 pontos do último deploy
3. Clique em **Redeploy**

## ✅ RESULTADO:
Seu projeto vai funcionar perfeitamente após essa configuração!

## 📱 PROJETO FUNCIONANDO:
- Landing page moderna
- Sistema de agendamento
- Dashboard completo
- Pagamentos via Pix/Mercado Pago 