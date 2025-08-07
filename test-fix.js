// Script para testar correção do pacote
async function fixPackage() {
  const response = await fetch('https://vncehdqqbasjdcszktna.supabase.co/functions/v1/fix-package-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2VoZHFxYmFzamRjc3prdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MTgxODYsImV4cCI6MjA2NDM5NDE4Nn0.STA_N9Ttdbf-xoFmr0i-YXKrtBEeBIIwJ3NfeFsbQgE'
    },
    body: JSON.stringify({
      package_id: 'PMT1754514579970'
    })
  });
  
  const result = await response.json();
  console.log('Resultado:', result);
}

fixPackage();