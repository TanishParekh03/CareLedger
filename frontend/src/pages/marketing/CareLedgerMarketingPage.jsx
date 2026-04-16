import { Suspense, lazy, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import '../../styles/marketing.css';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const MarketingBelowFold = lazy(() => import('./MarketingBelowFold'));

const MARQUEE_COPY =
  'CareLedger  ✦  Secure Records  ✦  OCR Scanning  ✦  Doctor Access  ✦  Prescription Tracking  ✦  ';

function CareLedgerMarketingPage() {
  const pageRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Warm up the lazy chunk early so the transition after section 4 never appears empty.
    import('./MarketingBelowFold');

    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (mounted) {
          ScrollTrigger.refresh();
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  useGSAP(
    (context) => {
      const q = context.selector;
      const splitInstances = [];
      const previousDefaults = ScrollTrigger.defaults();

      ScrollTrigger.defaults({
        start: 'top 80%',
        toggleActions: 'play none none none',
      });

      const preloader = q('.mk-preloader')[0];
      const counter = q('.mk-preloader-count')[0];
      const topPanel = q('.mk-preloader-top')[0];
      const bottomPanel = q('.mk-preloader-bottom')[0];

      const eyebrow = q('.mk-hero-eyebrow')[0];
      const h1Lines = q('.mk-hero-line-text');
      const subtext = q('.mk-hero-sub')[0];
      const ctas = q('.mk-hero-actions .mk-cta');
      const statsRow = q('.mk-hero-stats')[0];

      const cursor = q('.mk-cursor')[0];
      const marqueeSection = q('.mk-marquee')[0];
      const marqueeTrack = q('.mk-marquee-track')[0];

      const statementSection = q('.mk-problem')[0];
      const statement = q('.mk-problem-statement')[0];
      const statementTag = q('.mk-problem-tag')[0];
      const problemScrollRange = '+=130%';

      const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
      const raf = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const heroTl = gsap.timeline({ paused: true, delay: 0.2 });

      const eyebrowSplit = new SplitText(eyebrow, { type: 'chars' });
      const subSplit = new SplitText(subtext, { type: 'chars' });
      splitInstances.push(eyebrowSplit, subSplit);

      heroTl
        .from(eyebrowSplit.chars, {
          opacity: 0,
          y: 20,
          duration: 0.55,
          stagger: 0.015,
          ease: 'power3.out',
        })
        .from(
          h1Lines,
          {
            yPercent: 110,
            duration: 0.9,
            ease: 'power4.out',
            stagger: 0.12,
            onStart: () => gsap.set(h1Lines, { willChange: 'transform' }),
            onComplete: () => gsap.set(h1Lines, { clearProps: 'willChange' }),
          },
          '-=0.25'
        )
        .from(
          subSplit.chars,
          {
            opacity: 0,
            y: 26,
            duration: 0.45,
            ease: 'power3.out',
            stagger: 0.009,
          },
          '-=0.45'
        )
        .from(
          ctas,
          {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
          },
          '-=0.28'
        )
        .from(
          statsRow,
          {
            opacity: 0,
            y: 20,
            duration: 0.6,
            ease: 'power2.out',
          },
          '-=0.35'
        );

      const countProxy = { value: 0 };
      const preloaderTl = gsap.timeline();
      preloaderTl
        .to(countProxy, {
          value: 100,
          duration: 1.8,
          ease: 'power2.inOut',
          snap: { value: 1 },
          onUpdate: () => {
            if (counter) {
              counter.textContent = String(Math.round(countProxy.value));
            }
          },
        })
        .to(counter, { opacity: 0, y: -40, duration: 0.4 })
        .to(
          [topPanel, bottomPanel],
          {
            yPercent: (i) => (i === 0 ? -100 : 100),
            duration: 0.9,
            ease: 'power3.inOut',
            stagger: 0.05,
            onComplete: () => {
              preloader.style.pointerEvents = 'none';
              heroTl.play();
            },
          },
          '-=0.05'
        )
        .to(preloader, { autoAlpha: 0, duration: 0.01 });

      const xTo = gsap.quickTo(cursor, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(cursor, 'y', { duration: 0.4, ease: 'power3' });
      const onPointerMove = (event) => {
        xTo(event.clientX - 24);
        yTo(event.clientY - 24);
      };
      window.addEventListener('pointermove', onPointerMove);

      const ctaTargets = q('.mk-cta');
      const onCtaEnter = () => gsap.to(cursor, { scale: 1.8, duration: 0.25, ease: 'power2.out' });
      const onCtaLeave = () => gsap.to(cursor, { scale: 1, duration: 0.25, ease: 'power2.out' });
      ctaTargets.forEach((node) => {
        node.addEventListener('mouseenter', onCtaEnter);
        node.addEventListener('mouseleave', onCtaLeave);
      });

      const statValues = q('.mk-stat-value');
      ScrollTrigger.create({
        trigger: statsRow,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          statValues.forEach((node) => {
            const target = Number(node.dataset.target || 0);
            const suffix = node.dataset.suffix || '';
            const proxy = { value: 0 };
            gsap.to(proxy, {
              value: target,
              duration: 1.2,
              ease: 'power2.out',
              snap: { value: 1 },
              onUpdate: () => {
                node.textContent = `${Math.round(proxy.value)}${suffix}`;
              },
            });
          });
        },
      });

      const marqueeTween = gsap.to(marqueeTrack, {
        x: '-50%',
        duration: 18,
        ease: 'none',
        repeat: -1,
      });

      const onMarqueeEnter = () => gsap.to(marqueeTween, { timeScale: -1, duration: 0.4, ease: 'power2.out' });
      const onMarqueeLeave = () => gsap.to(marqueeTween, { timeScale: 1, duration: 0.4, ease: 'power2.out' });
      marqueeSection.addEventListener('mouseenter', onMarqueeEnter);
      marqueeSection.addEventListener('mouseleave', onMarqueeLeave);

      const problemSplit = new SplitText(statement, { type: 'words' });
      splitInstances.push(problemSplit);
      gsap.set(problemSplit.words, { color: '#D0CEC8' });

      ScrollTrigger.create({
        trigger: statementSection,
        start: 'top top',
        end: problemScrollRange,
        pin: true,
      });

      gsap.to(problemSplit.words, {
        color: 'var(--charcoal)',
        stagger: { each: 0.04 },
        ease: 'none',
        scrollTrigger: {
          trigger: statementSection,
          start: 'top top',
          end: problemScrollRange,
          scrub: 1,
        },
      });

      gsap.fromTo(
        statementTag,
        { autoAlpha: 0, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: statementSection,
            start: 'top+=78% top',
            end: 'top+=122% top',
            scrub: 1,
          },
        }
      );

      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        ctaTargets.forEach((node) => {
          node.removeEventListener('mouseenter', onCtaEnter);
          node.removeEventListener('mouseleave', onCtaLeave);
        });
        marqueeSection.removeEventListener('mouseenter', onMarqueeEnter);
        marqueeSection.removeEventListener('mouseleave', onMarqueeLeave);
        splitInstances.forEach((instance) => instance.revert());
        ScrollTrigger.defaults(previousDefaults);
        lenis.destroy();
        gsap.ticker.remove(raf);
      };
    },
    { scope: pageRef }
  );

  return (
    <main className="mk-home" ref={pageRef}>
      <div className="mk-cursor" aria-hidden="true" />

      <div className="mk-preloader" aria-hidden="true">
        <div className="mk-preloader-panel mk-preloader-top" />
        <div className="mk-preloader-panel mk-preloader-bottom" />
        <div className="mk-preloader-count">0</div>
      </div>

      <section className="mk-hero">
        <header className="mk-nav">
          <p className="mk-brand">CareLedger</p>
          <div className="mk-nav-actions">
            <Link to="/login" className="mk-cta mk-cta-outline">Login</Link>
            <Link to="/signup" className="mk-cta mk-cta-solid">Signup</Link>
          </div>
        </header>

        <div className="mk-hero-content">
          <p className="mk-hero-eyebrow">HEALTHCARE · REIMAGINED · 2025</p>

          <h1 className="mk-hero-title" aria-label="Your Medical Records, Finally Under Your Control.">
            <span className="mk-hero-line"><span className="mk-hero-line-text">Your Medical Records,</span></span>
            <span className="mk-hero-line"><span className="mk-hero-line-text">Finally Under</span></span>
            <span className="mk-hero-line"><span className="mk-hero-line-text">Your Control.</span></span>
          </h1>

          <p className="mk-hero-sub">
            CareLedger gives patients, doctors, and clinics a single secure platform for every consultation,
            prescription, and health record.
          </p>

          <div className="mk-hero-actions">
            <Link to="/signup" className="mk-cta mk-cta-solid">Get Started →</Link>
            <a href="#how-it-works" className="mk-cta mk-cta-outline">Watch how it works</a>
          </div>

          <div className="mk-hero-stats" id="how-it-works">
            <div className="mk-stat-item">
              <span className="mk-stat-value" data-target="500" data-suffix="+">0+</span>
              <p>Patients</p>
            </div>
            <div className="mk-stat-item">
              <span className="mk-stat-value" data-target="120" data-suffix="+">0+</span>
              <p>Doctors</p>
            </div>
            <div className="mk-stat-item">
              <span className="mk-stat-value" data-target="98" data-suffix="%">0%</span>
              <p>Uptime</p>
            </div>
            <div className="mk-stat-item">
              <span className="mk-stat-value" data-target="1">0</span>
              <p>OCR Powered</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-marquee">
        <div className="mk-marquee-track">
          <span>{MARQUEE_COPY}</span>
          <span>{MARQUEE_COPY}</span>
          <span>{MARQUEE_COPY}</span>
          <span>{MARQUEE_COPY}</span>
        </div>
      </section>

      <section className="mk-problem">
        <div className="mk-problem-inner">
          <h2 className="mk-problem-statement">
            Most patients have no idea what medications they&apos;re on, what their doctor said last month, or who has
            access to their records.
          </h2>
          <p className="mk-problem-tag">This is why we built CareLedger.</p>
        </div>
      </section>

      <Suspense
        fallback={(
          <section className="mk-lazy-fallback" aria-hidden="true">
            <div className="mk-lazy-fallback-card" />
          </section>
        )}
      >
        <MarketingBelowFold />
      </Suspense>
    </main>
  );
}

export default CareLedgerMarketingPage;
