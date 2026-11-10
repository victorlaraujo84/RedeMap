import { User, UserRole } from '../types';
import { DatabaseService } from './database';

const AUTH_USER_KEY = 'redemap_current_user_v2';

export const AuthService = {
  getCurrentUser(): User {
    if (typeof window === 'undefined') {
      return DatabaseService.getUsers()[0];
    }

    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        // Verify user still exists in database
        const dbUser = DatabaseService.getUsers().find((u) => u.id === parsed.id);
        if (dbUser) return dbUser;
      }
    } catch {
      // ignore
    }

    // Default to first user (Admin) for seamless initial experience
    const defaultUser = DatabaseService.getUsers()[0];
    AuthService.setCurrentUser(defaultUser);
    return defaultUser;
  },

  setCurrentUser(user: User): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.error('Failed to store user session:', err);
    }
  },

  login(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const user = DatabaseService.findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado com este e-mail.' };
    }

    if (user.passwordHash && user.passwordHash !== password) {
      return { success: false, error: 'Senha incorreta. Tente novamente.' };
    }

    AuthService.setCurrentUser(user);
    return { success: true, user };
  },

  register(name: string, email: string, password: string, role: UserRole = 'operator'): { success: boolean; user?: User; error?: string } {
    const existing = DatabaseService.findUserByEmail(email);
    if (existing) {
      return { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' };
    }

    if (!name || !email || !password) {
      return { success: false, error: 'Preencha todos os campos obrigatórios.' };
    }

    if (password.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      email,
      role,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
      passwordHash: password,
    };

    DatabaseService.addUser(newUser);
    AuthService.setCurrentUser(newUser);

    DatabaseService.logChangeEvent({
      entityType: 'identity',
      entityId: newUser.id,
      entityName: newUser.name,
      type: 'created',
      severity: 'info',
      before: null,
      after: { email: newUser.email, role: newUser.role },
      details: `Novo usuário ${newUser.name} (${newUser.role.toUpperCase()}) cadastrado no RedeMap.`,
    });

    return { success: true, user: newUser };
  },

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_USER_KEY);
  },

  canEdit(user: User | null): boolean {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'operator';
  },

  isAdmin(user: User | null): boolean {
    if (!user) return false;
    return user.role === 'admin';
  },
};
