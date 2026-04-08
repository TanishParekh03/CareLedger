import { useMemo, useState } from 'react';
import { Activity, Eye, EyeOff, KeyRound, Mail, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

const ROLE_OPTIONS = ['patient', 'doctor', 'admin'];

const ROLE_COPY = {
  patient: {
    eyebrow: 'Personal Health Vault',
    title: 'Access Your Medical Story',
    description:
      'Track consultations, allergies, chronic conditions, and control exactly which doctors can view your records.',
  },
  doctor: {
    eyebrow: 'Clinical Command Center',
    title: 'Precision Care, One Dashboard',
    description:
      'Review patient histories, run consultations, and save prescriptions with an interface optimized for focus.',
  },
  admin: {
    eyebrow: 'Operations Console',
    title: 'Keep CareLedger Trusted',
    description:
      'Verify doctors, monitor platform access, and maintain clinical governance at scale.',
  },
};

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState('patient');
  const [identifierType, setIdentifierType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errors, setErrors] = useState({});

  const heroCopy = useMemo(() => ROLE_COPY[activeRole], [activeRole]);

  const validate = () => {
    const nextErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = identifierType === 'email' ? 'Email is required.' : 'Phone number is required.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        role: activeRole,
        plain_password: password,
        [identifierType]: identifier,
      };

      const response = await loginUser(payload);
      const token = response?.data?.token;

      if (!token) {
        setErrorMessage('Token not returned by server. Please try again.');
        return;
      }

      login(token);

      if (activeRole === 'patient') {
        navigate('/dashboard/patient');
      } else if (activeRole === 'doctor') {
        navigate('/dashboard/doctor');
      } else {
        navigate('/dashboard/admin');
      }
    } catch (error) {
      const apiMessage = error?.response?.data?.error?.message;
      setErrorMessage(apiMessage || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-surface">
        <aside className="login-hero">
          <div className="hero-badge">
            <Activity size={14} />
            <span>CareLedger Intelligence</span>
          </div>

          <p className="hero-eyebrow">{heroCopy.eyebrow}</p>
          <h1>{heroCopy.title}</h1>
          <p className="hero-description">{heroCopy.description}</p>

          <div className="hero-metric-panel">
            <div>
              <p className="metric-value">4.8</p>
              <p className="metric-label">Clinical usability rating</p>
            </div>
            <div className="metric-bars" aria-hidden="true">
              <span className="bar bar-teal" />
              <span className="bar bar-accent" />
              <span className="bar bar-muted" />
            </div>
          </div>
        </aside>

        <section className="login-card-wrap">
          <div className="login-card">
            <header className="login-header">
              <p>Sign In</p>
              <h2>Welcome back</h2>
            </header>

            <div className="role-tabs" role="tablist" aria-label="Select account role">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="tab"
                  aria-selected={activeRole === role}
                  className={activeRole === role ? 'role-tab active' : 'role-tab'}
                  onClick={() => setActiveRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="id-toggle">
                <button
                  type="button"
                  className={identifierType === 'email' ? 'id-chip active' : 'id-chip'}
                  onClick={() => setIdentifierType('email')}
                >
                  <Mail size={14} />
                  Email
                </button>
                <button
                  type="button"
                  className={identifierType === 'phone' ? 'id-chip active' : 'id-chip'}
                  onClick={() => setIdentifierType('phone')}
                >
                  <Phone size={14} />
                  Phone
                </button>
              </div>

              <label className="field">
                <span>{identifierType === 'email' ? 'Email address' : 'Phone number'}</span>
                <input
                  type={identifierType === 'email' ? 'email' : 'tel'}
                  placeholder={identifierType === 'email' ? 'name@domain.com' : '+91 98765 43210'}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errors.identifier) {
                      setErrors((prev) => ({ ...prev, identifier: '' }));
                    }
                  }}
                />
                {errors.identifier ? <small className="field-error">{errors.identifier}</small> : null}
              </label>

              <label className="field">
                <span>Password</span>
                <div className="password-wrap">
                  <KeyRound size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password ? <small className="field-error">{errors.password}</small> : null}
              </label>

              {errorMessage ? <p className="submit-error">{errorMessage}</p> : null}

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in to CareLedger'}
              </button>
            </form>

            <p className="auth-switch-text">
              New to CareLedger? <Link to="/signup">Create account</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
