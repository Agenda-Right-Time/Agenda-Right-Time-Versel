// Componente de debug temporário para verificar problemas
const DebugInfo = () => {
  console.log('🚀 Debug - Renderizando DebugInfo');
  console.log('📊 Variáveis de ambiente:', {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅ Definida' : '❌ Undefined',
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'black',
      color: 'white',
      padding: '20px',
      zIndex: 9999,
      fontSize: '14px'
    }}>
      <h2>🔍 Debug Info - Vercel Deploy</h2>
      <p><strong>Supabase URL:</strong> {supabaseUrl ? '✅ Definida' : '❌ Undefined'}</p>
      <p><strong>Supabase Key:</strong> {supabaseKey ? '✅ Definida' : '❌ Undefined'}</p>
      <p><strong>Modo:</strong> {import.meta.env.MODE}</p>
      <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
      
      {(!supabaseUrl || !supabaseKey) && (
        <div style={{ backgroundColor: 'red', padding: '10px', marginTop: '10px' }}>
          ⚠️ PROBLEMA: Variáveis de ambiente não encontradas!
          <br />Verifique no Vercel Dashboard se as variáveis estão configuradas corretamente.
        </div>
      )}
    </div>
  );
};

export default DebugInfo; 