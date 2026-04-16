import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Link } from 'react-router-dom';
import {
  Shield,
  ClipboardList,
  ScanLine,
  Pill,
  Siren,
  Building2,
  UserRound,
  Stethoscope,
} from 'lucide-react';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const FEATURE_ITEMS = [
  {
    icon: Shield,
    title: 'Access Control',
    body: 'Grant or revoke doctor access to your records with expiry dates',
    tone: 'teal',
  },
  {
    icon: ClipboardList,
    title: 'Smart Consultations',
    body: 'Every visit logged with prescriptions attached',
    tone: 'gold',
  },
  {
    icon: ScanLine,
    title: 'OCR Scanning',
    body: 'Scan paper prescriptions and extract medicine, dosage, and schedule automatically',
    tone: 'mint',
  },
  {
    icon: Pill,
    title: 'Medication Tracker',
    body: 'Know exactly what you are taking and who prescribed it',
    tone: 'blue',
  },
  {
    icon: Siren,
    title: 'Emergency Data',
    body: 'First responders can access allergy and condition details instantly',
    tone: 'coral',
  },
  {
    icon: Building2,
    title: 'Clinic Management',
    body: 'Verified doctors can manage multiple clinic profiles in one workspace',
    tone: 'olive',
  },
];

function MarketingBelowFold() {
  const sectionRef = useRef(null);

  useGSAP(
    (context) => {
      const q = context.selector;
      const splitInstances = [];

      const howContainer = q('.mk-how')[0];
      const panels = gsap.utils.toArray('.mk-how-panel', sectionRef.current);

      const horizontalTween = gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: howContainer,
          start: 'top top',
          pin: true,
          scrub: 1,
          snap: 1 / (panels.length - 1),
          end: () => `+=${howContainer.offsetWidth * (panels.length - 1)}`,
        },
      });

      panels.forEach((panel) => {
        const titleText = panel.querySelector('.mk-step-title-text');
        const body = panel.querySelector('.mk-step-body');

        gsap.fromTo(
          titleText,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: 'power4.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: panel,
              containerAnimation: horizontalTween,
              start: 'left 72%',
            },
            onStart: () => gsap.set(titleText, { willChange: 'transform' }),
            onComplete: () => gsap.set(titleText, { clearProps: 'willChange' }),
          }
        );

        gsap.fromTo(
          body,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: panel,
              containerAnimation: horizontalTween,
              start: 'left 68%',
            },
          }
        );
      });

      const ocrBeam = q('.mk-ocr-beam')[0];
      gsap.fromTo(
        ocrBeam,
        { scaleY: 0, transformOrigin: 'top center' },
        {
          scaleY: 1,
          duration: 1.05,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        }
      );

      const featureCards = gsap.utils.toArray('.mk-feature-card', sectionRef.current);
      ScrollTrigger.batch(featureCards, {
        start: 'top 85%',
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0,
            y: 60,
            stagger: 0.08,
            duration: 0.8,
            ease: 'power3.out',
          });
        },
      });

      const statsSection = q('.mk-impact')[0];
      const impactValues = q('.mk-impact-number');
      ScrollTrigger.create({
        trigger: statsSection,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          impactValues.forEach((node) => {
            const target = Number(node.dataset.target || 0);
            const prefix = node.dataset.prefix || '';
            const suffix = node.dataset.suffix || '';
            const decimals = Number(node.dataset.decimals || 0);
            const proxy = { value: 0 };

            gsap.to(proxy, {
              value: target,
              duration: 1.2,
              ease: 'power2.out',
              snap: decimals > 0 ? false : { value: 1 },
              onUpdate: () => {
                const display = decimals > 0 ? proxy.value.toFixed(decimals) : String(Math.round(proxy.value));
                node.textContent = `${prefix}${display}${suffix}`;
              },
            });
          });
        },
      });

      const patientCard = q('.mk-audience-card.patient')[0];
      const doctorCard = q('.mk-audience-card.doctor')[0];
      gsap.from([patientCard, doctorCard], {
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        x: (i) => (i === 0 ? -80 : 80),
        scrollTrigger: {
          trigger: '.mk-audience',
          start: 'top 75%',
        },
      });

      const audienceCards = [patientCard, doctorCard];
      const enterFns = [];
      const leaveFns = [];
      audienceCards.forEach((card) => {
        const onEnter = () => {
          gsap.to(card, {
            scale: 1.02,
            boxShadow: '0 28px 56px rgba(20, 24, 26, 0.24)',
            duration: 0.45,
            ease: 'power3.out',
          });
        };

        const onLeave = () => {
          gsap.to(card, {
            scale: 1,
            boxShadow: '0 14px 34px rgba(20, 24, 26, 0.16)',
            duration: 0.45,
            ease: 'power3.out',
          });
        };

        enterFns.push(onEnter);
        leaveFns.push(onLeave);
        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mouseleave', onLeave);
      });

      const ctaHeading = q('.mk-cta-heading')[0];
      const ctaSplit = new SplitText(ctaHeading, { type: 'chars' });
      splitInstances.push(ctaSplit);

      gsap.fromTo(
        ctaSplit.chars,
        {
          opacity: 0,
          y: 80,
          rotateX: -90,
          transformOrigin: 'top center',
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.025,
          duration: 0.8,
          ease: 'power4.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: '.mk-cta-banner',
            start: 'top 82%',
          },
        }
      );

      gsap.from('.mk-footer-wrap', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.mk-footer',
          start: 'top 85%',
        },
      });

      return () => {
        splitInstances.forEach((instance) => instance.revert());
        audienceCards.forEach((card, index) => {
          card.removeEventListener('mouseenter', enterFns[index]);
          card.removeEventListener('mouseleave', leaveFns[index]);
        });
      };
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef}>
      <section className="mk-how" id="overview">
        <div className="mk-how-track">
          <article className="mk-how-panel">
            <span className="mk-step-ghost">01</span>
            <div className="mk-step-content">
              <p className="mk-step-label">Signup and Profile</p>
              <h3 className="mk-step-title-wrap">
                <span className="mk-step-title-text">Create your profile in 60 seconds</span>
              </h3>
              <p className="mk-step-body">
                Patient or doctor, fill your health ID, blood group, license number. One form. Done.
              </p>
            </div>
            <div className="mk-step-visual profile">
              <div className="mk-mock-card">
                <span className="mk-mock-line lg" />
                <span className="mk-mock-line" />
                <span className="mk-mock-line" />
                <span className="mk-mock-chip" />
              </div>
            </div>
          </article>

          <article className="mk-how-panel">
            <span className="mk-step-ghost">02</span>
            <div className="mk-step-content">
              <p className="mk-step-label">Grant Access</p>
              <h3 className="mk-step-title-wrap">
                <span className="mk-step-title-text">You control who sees what</span>
              </h3>
              <p className="mk-step-body">
                Share records with specific doctors for specific time windows. Revoke anytime with one tap.
              </p>
            </div>
            <div className="mk-step-visual toggle">
              <div className="mk-toggle-row">
                <span>Dr. Krishan</span>
                <span className="mk-toggle-on" />
              </div>
              <div className="mk-toggle-row muted">
                <span>Expired Share</span>
                <span className="mk-toggle-off" />
              </div>
            </div>
          </article>

          <article className="mk-how-panel">
            <span className="mk-step-ghost">03</span>
            <div className="mk-step-content">
              <p className="mk-step-label">Consult and Prescribe</p>
              <h3 className="mk-step-title-wrap">
                <span className="mk-step-title-text">Every consultation, captured forever</span>
              </h3>
              <p className="mk-step-body">
                Doctors log prescriptions digitally, or scan paper slips and let OCR parse medicine data for you.
              </p>
            </div>
            <div className="mk-step-visual ocr">
              <div className="mk-ocr-card">
                <span className="mk-mock-line lg" />
                <span className="mk-mock-line" />
                <span className="mk-mock-line" />
                <span className="mk-mock-line sm" />
                <div className="mk-ocr-beam" />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mk-features" id="for-patients">
        <div className="mk-features-wrap">
          <p className="mk-features-eyebrow">BUILT FOR REAL CARE</p>
          <h2 className="mk-features-heading">Everything your health journey needs</h2>

          <div className="mk-feature-grid">
            {FEATURE_ITEMS.map((item) => (
              <article className="mk-feature-card" key={item.title}>
                <div className={`mk-feature-icon ${item.tone}`}>
                  <item.icon size={20} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-impact">
        <div className="mk-impact-grid">
          <article className="mk-impact-item">
            <p className="mk-impact-number" data-target="73" data-suffix="%">0%</p>
            <span>of patients do not know who has access to their records</span>
          </article>
          <article className="mk-impact-item">
            <p className="mk-impact-number" data-target="4.2" data-decimals="1" data-suffix="x">0x</p>
            <span>more efficient prescription logging vs paper workflows</span>
          </article>
          <article className="mk-impact-item">
            <p className="mk-impact-number" data-target="8" data-prefix="< " data-suffix=" sec">0 sec</p>
            <span>OCR scan time per prescription</span>
          </article>
          <article className="mk-impact-item">
            <p className="mk-impact-number" data-target="100" data-suffix="%">0%</p>
            <span>data stays yours, with no third-party selling</span>
          </article>
        </div>
      </section>

      <section className="mk-audience" id="for-doctors">
        <article className="mk-audience-card patient">
          <UserRound size={26} />
          <h3>Own your health story</h3>
          <p>
            Track every condition, allergy, and consultation. Control visibility for each doctor. Never lose a
            prescription again.
          </p>
          <Link to="/signup" className="mk-audience-cta patient">I&apos;m a Patient →</Link>
        </article>

        <article className="mk-audience-card doctor">
          <Stethoscope size={26} />
          <h3>Practice without the paperwork</h3>
          <p>
            Log consultations, issue digital prescriptions, scan paper records, and manage clinics from one place.
          </p>
          <Link to="/signup" className="mk-audience-cta doctor">I&apos;m a Doctor →</Link>
        </article>
      </section>

      <section className="mk-cta-banner">
        <h2 className="mk-cta-heading">Your records. Your rules. Starting now.</h2>
        <div className="mk-cta-banner-actions">
          <Link to="/signup" className="mk-cta mk-cta-solid">Get Started for Free</Link>
          <a href="#overview" className="mk-cta mk-cta-muted">Read the docs</a>
        </div>
      </section>

      <footer className="mk-footer" id="login">
        <div className="mk-footer-wrap">
          <div className="mk-footer-top">
            <p className="mk-footer-logo">CareLedger</p>
            <nav className="mk-footer-nav">
              <a href="#overview">Overview</a>
              <a href="#for-patients">For Patients</a>
              <a href="#for-doctors">For Doctors</a>
              <Link to="/login">Login</Link>
            </nav>
            <div className="mk-footer-socials">
              <a href="#overview">X</a>
              <a href="#overview">In</a>
              <a href="#overview">Yt</a>
            </div>
          </div>

          <div className="mk-footer-bottom">
            <p>© 2025 CareLedger. Built for better healthcare.</p>
            <p>Privacy Policy · Terms</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MarketingBelowFold;
