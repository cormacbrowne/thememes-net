
import { useState } from 'react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../supabaseClient';

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = isSignUp ? signUpWithEmail : signInWithEmail;
    const { error } = await action(email, password);
    if (error) setError(error.message);
    else window.location.reload(); // refresh after login/signup
  };

  return (
    <div className="auth-form">
      <h2>{isSignUp ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">{isSignUp ? 'Create Account' : 'Login'}</button>
      </form>
      <button onClick={() => signInWithGoogle()}>Sign in with Google</button>
      <p onClick={() => setIsSignUp(!isSignUp)} style={{ cursor: 'pointer', marginTop: 10 }}>
        {isSignUp ? 'Already have an account? Login' : 'New user? Sign Up'}
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default AuthForm;
