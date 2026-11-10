import React, { useState } from 'react';
import { User, Lock, Mail, Shield, UserPlus, LogIn, AlertCircle, CheckCircle, X } from 'lucide-react';
import { AuthService } from '../services/auth';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: import('../types').User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = AuthService.login(email, password);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
      onClose();
    } else {
      setError(result.error || 'Credenciais inválidas.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = AuthService.register(name, email, password, role);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
      onClose();
    } else {
      setError(result.error || 'Erro ao registrar usuário.');
    }
  };

  const handleQuickDemoLogin = (demoEmail: string, demoPass: string) => {
    setError(null);
    const result = AuthService.login(demoEmail, demoPass);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-bold text-white text-base">Autenticação RedeMap</h2>
              <p className="text-[11px] text-slate-400">Controle de acesso baseado em papéis (RBAC)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar com Conta</span>
          </button>
          <button
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Nova Conta</span>
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@redemap.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-cyan-900/30 transition"
              >
                Acessar Plataforma
              </button>

              {/* Quick Demo Accounts */}
              <div className="pt-3 border-t border-slate-800">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Ou faça login instantâneo com contas de demonstração:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@redemap.io', 'admin123')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-center border border-slate-700 transition"
                  >
                    <div className="text-[11px] font-bold text-cyan-400">Administrador</div>
                    <div className="text-[9px] text-slate-400">admin@redemap.io</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('operador@redemap.io', 'operador123')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-center border border-slate-700 transition"
                  >
                    <div className="text-[11px] font-bold text-emerald-400">Operador</div>
                    <div className="text-[9px] text-slate-400">operador@redemap.io</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('visitante@redemap.io', 'visitante123')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-center border border-slate-700 transition"
                  >
                    <div className="text-[11px] font-bold text-slate-300">Visualizador</div>
                    <div className="text-[9px] text-slate-400">visitante@redemap.io</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do Engenheiro / Analista"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Perfil de Permissão (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="operator">Operador (Importação, Coletas e Edições)</option>
                  <option value="admin">Administrador (Permissão Total do Sistema)</option>
                  <option value="viewer">Visualizador (Consulta Somente-Leitura)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-900/30 transition mt-2"
              >
                Registrar e Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
