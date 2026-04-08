import { useMemo, useState } from 'react';
import { Activity, Eye, EyeOff, KeyRound, Mail, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signupUser } from '../../api/auth';

const ROLE_OPTIONS = ['patient', 'doctor'];

const ROLE_COPY = {
  patient: {
    eyebrow: 'Patient Onboarding',
    title: 'Create Your Health Record Home',
    description:
      'Join CareLedger to manage consultations, emergency contacts, allergies, and secure doctor access controls.',
  },
  doctor: {
    eyebrow: 'Doctor Onboarding',
    title: 'Build Your Clinical Workspace',
    description:
      'Create your doctor account, complete profile setup, and get verified to access consultation workflows.',
  },
};

function SignupPage() {
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState('patient');
  const [form, setForm] = useState({
    email: '',
    phone: '',
    plain_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heroCopy = useMemo(() => ROLE_COPY[activeRole], [activeRole]);

  const validate = () => {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone is required.';
    }

    if (!form.plain_password.trim()) {
      nextErrors.plain_password = 'Password is required.';
    }

    if (form.plain_password.length > 0 && form.plain_password.length < 8) {
      nextErrors.plain_password = 'Password must be at least 8 characters.';
    }

    if (form.confirm_password !== form.plain_password) {
      nextErrors.confirm_password = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signupUser({
        role: activeRole,
        email: form.email.trim(),
        phone: form.phone.trim(),
        plain_password: form.plain_password,
      });

      setSuccessMessage('Account created successfully. Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      const apiMessage = error?.response?.data?.error?.message;
      setErrorMessage(apiMessage || 'Signup failed. Please try again.');
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
            <span>CareLedger Enrollment</span>
          </div>

          <p className="hero-eyebrow">{heroCopy.eyebrow}</p>
          <h1>{heroCopy.title}</h1>
          <p className="hero-description">{heroCopy.description}</p>

          <div className="hero-metric-panel">
            <div>
              <p className="metric-value">256-bit</p>
              <p className="metric-label">Encrypted patient-grade records</p>
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
              <p>Sign Up</p>
              <h2>Create account</h2>
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
              <label className="field">
                <span>Email address</span>
                <div className="password-wrap">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                {errors.email ? <small className="field-error">{errors.email}</small> : null}
              </label>

              <label className="field">
                <span>Phone number</span>
                <div className="password-wrap">
                  <Phone size={16} />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                {errors.phone ? <small className="field-error">{errors.phone}</small> : null}
              </label>

              <label className="field">
                <span>Password</span>
                <div className="password-wrap">
                  <KeyRound size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={form.plain_password}
                    onChange={(e) => setForm((prev) => ({ ...prev, plain_password: e.target.value }))}
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
                {errors.plain_password ? <small className="field-error">{errors.plain_password}</small> : null}
              </label>

              <label className="field">
                <span>Confirm password</span>
                <div className="password-wrap">
                  <KeyRound size={16} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={form.confirm_password}
                    onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirm_password ? <small className="field-error">{errors.confirm_password}</small> : null}
              </label>

              {errorMessage ? <p className="submit-error">{errorMessage}</p> : null}
              {successMessage ? <p className="submit-success">{successMessage}</p> : null}

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create CareLedger account'}
              </button>
            </form>

            <p className="auth-switch-text">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default SignupPage;
