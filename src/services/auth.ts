// Custom Auth Service (Replaces Firebase)

export const loginWithEmail = async (email: string, pass: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  return response.json();
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, name })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }
  return response.json();
};

export const adminCreateUser = async (email: string, pass: string, name: string) => {
  // In our custom backend, admin can just call register or a specific admin route
  return registerWithEmail(email, pass, name);
};

export const logout = async () => {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Logout failed');
  return response.json();
};

export const subscribeToAuth = (callback: (user: any) => void) => {
  // Check current user on mount
  fetch('/api/auth/me')
    .then(res => res.ok ? res.json() : null)
    .then(callback)
    .catch(() => callback(null));
  
  // Return a dummy unsubscribe
  return () => {};
};

export const resetPassword = async (email: string) => {
  // Custom password reset logic would go here
  console.log('Password reset requested for:', email);
  throw new Error('Password reset is not implemented in custom backend yet.');
};

export const loginWithGoogle = async () => {
  throw new Error('Google Login is not implemented in custom backend yet.');
};
