// Página de teste super simples
const TestePage = () => {
  console.log('🚀 TestePage renderizada');
  
  return (
    <div style={{ 
      backgroundColor: 'green', 
      color: 'white', 
      padding: '50px',
      textAlign: 'center',
      fontSize: '24px'
    }}>
      <h1>✅ PROJETO FUNCIONANDO!</h1>
      <p>Se você vê esta tela, o deploy está OK</p>
      <p>Timestamp: {new Date().toLocaleString()}</p>
      
      <div style={{ marginTop: '20px', fontSize: '16px' }}>
        <h3>🔍 Debug Info:</h3>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅' : '❌'}</p>
        <p>Supabase Key: {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅' : '❌'}</p>
      </div>
    </div>
  );
};

export default TestePage; 