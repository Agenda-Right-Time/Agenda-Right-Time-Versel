
import React from 'react';
import { Link } from 'react-router-dom';

const RoutesDemo = () => {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gold-500 mb-8 text-center">
          Todas as Páginas do Sistema
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Páginas Públicas */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-green-400 mb-4">Páginas Públicas</h2>
            <div className="space-y-3">
              <Link 
                to="/landing" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                🏠 Landing Page
              </Link>
              <Link 
                to="/login" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                🔐 Página de Login
              </Link>
              <Link 
                to="/agendamento-publico?owner=demo" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                📅 Agendamento Público
              </Link>
              <Link 
                to="/dashboard-publico" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                📊 Dashboard do Profissional
              </Link>
              <Link 
                to="/cliente-dashboard?owner=demo" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                👤 Dashboard do Cliente
              </Link>
            </div>
          </div>

          {/* Páginas com Autenticação */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">Páginas com Auth</h2>
            <div className="space-y-3">
              <Link 
                to="/" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                🏠 Index Original
              </Link>
              <Link 
                to="/dashboard" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                📊 Dashboard Original
              </Link>
              <Link 
                to="/agendamento?owner=demo" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                📅 Agendamento Original
              </Link>
            </div>
          </div>

          {/* Páginas Admin */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Páginas Admin</h2>
            <div className="space-y-3">
              <Link 
                to="/admin-login" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                🔐 Admin Login
              </Link>
              <Link 
                to="/admin-dashboard" 
                className="block bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                ⚙️ Admin Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">Como usar:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• <strong>Páginas Públicas:</strong> Funcionam sem autenticação, ideais para testar UI</li>
            <li>• <strong>Páginas com Auth:</strong> Requerem login, funcionalidade completa</li>
            <li>• <strong>Páginas Admin:</strong> Para administração do sistema</li>
            <li>• Você pode editar cada página independentemente</li>
            <li>• Use parâmetros ?owner=demo para simular dados</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoutesDemo;
