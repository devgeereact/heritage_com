import { Container, Row, Col, Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import ContactForm from './ContactForm';
import './landing.css';

const offers = [
  {
    feature: true,
    badge: 'Our craft',
    icon: 'solar:scissors-square-bold-duotone',
    title: 'Bespoke tailoring',
    desc: 'Cut from your own measurements, one garment at a time. Agbada, kaftan, two-piece suits and senator styles, made to fit you and no one else.',
    cta: 'Book a fitting',
  },
  {
    badge: 'Made for you',
    icon: 'solar:ruler-pen-bold-duotone',
    title: 'Made-to-measure',
    desc: 'Choose a house pattern, then we adjust it to your size and your fabric. A faster route to a sharp fit without a full bespoke build.',
    cta: 'Start an order',
  },
  {
    badge: 'Ready to wear',
    icon: 'solar:hanger-2-bold-duotone',
    title: 'The shop',
    desc: 'Finished pieces in our heritage fabrics, ready to buy online or from the market floor in Lagos. Sized, stocked and ready to wear.',
    cta: 'Browse the shop',
  },
];

const steps = [
  { n: '1', t: 'Measure', d: 'We take your measurements in person or from a guide, and keep them on file for next time.' },
  { n: '2', t: 'Choose cloth', d: 'Pick from Ankara, Adire, Aso-oke and plain suiting. We advise on what suits the style.' },
  { n: '3', t: 'Cut & sew', d: 'Our tailors cut the pattern and stitch the garment by hand on the workshop floor.' },
  { n: '4', t: 'Fit & finish', d: 'You come in for a fitting, we adjust, press and finish. Then it is yours.' },
];

const tiles = [
  { c: 'hl-t1', s: 'Agbada', l: 'Three-piece, hand-embroidered' },
  { c: 'hl-t2', s: 'Senator', l: 'Tailored two-piece' },
  { c: 'hl-t3', s: 'Kaftan', l: 'Adire and plain cotton' },
  { c: 'hl-t4', s: 'Suiting', l: 'Made-to-measure jackets' },
];

const LandingPage = () => {
  useEffect(() => {
    document.title = 'Herit Clothing — Bespoke African menswear, tailored in Lagos';
    return () => { document.title = DEFAULT_PAGE_TITLE; };
  }, []);

  return (
    <div className="hl-page">
      {/* Nav */}
      <Navbar expand="lg" className="hl-nav py-3">
        <Container>
          <Navbar.Brand as={Link} to="/" className="hl-brand">Herit<span>Clothing</span></Navbar.Brand>
          <Navbar.Toggle aria-controls="hl-menu" />
          <Navbar.Collapse id="hl-menu">
            <Nav className="mx-auto gap-lg-2">
              <Nav.Link href="#tailoring">Tailoring</Nav.Link>
              <Nav.Link href="#craft">Our craft</Nav.Link>
              <Nav.Link href="#heritage">Heritage</Nav.Link>
              <Nav.Link href="#pieces">Pieces</Nav.Link>
              <Nav.Link href="#contact">Contact</Nav.Link>
            </Nav>
            <div className="d-flex align-items-center gap-3">
              <Link to="/auth/sign-in" className="hl-login">Login</Link>
              <a href="#contact" className="hl-btn hl-btn-primary">
                <IconifyIcon icon="solar:calendar-mark-bold" /> Book a fitting
              </a>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero */}
      <section className="hl-hero">
        <Container>
          <Row className="align-items-center g-5">
            <Col lg={6}>
              <span className="hl-eyebrow"><IconifyIcon icon="solar:scissors-bold" /> Tailors first, since Lagos</span>
              <h1 className="mt-3 hl-serif">Menswear <em>cut to fit you</em>, rooted in African heritage.</h1>
              <p className="hl-hero-lead mt-3">
                Herit Clothing is a tailoring house. We measure, cut and sew agbada, kaftan,
                senator and suiting in heritage fabrics, then finish each piece by hand. The shop
                comes second to the craft.
              </p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <a href="#contact" className="hl-btn hl-btn-primary">
                  <IconifyIcon icon="solar:calendar-mark-bold" /> Book a fitting
                </a>
                <a href="#pieces" className="hl-btn hl-btn-ghost">
                  <IconifyIcon icon="solar:hanger-2-linear" /> See our work
                </a>
              </div>
              <div className="hl-stats mt-5">
                <div><div className="hl-stat-n hl-serif">Bespoke</div><div className="hl-stat-l">Made to measure</div></div>
                <div><div className="hl-stat-n hl-serif">By hand</div><div className="hl-stat-l">Cut & sewn in Lagos</div></div>
                <div><div className="hl-stat-n hl-serif">Heritage</div><div className="hl-stat-l">African fabrics</div></div>
              </div>
            </Col>
            <Col lg={6}>
              <div className="hl-hero-card">
                <div className="hl-hero-card-inner">
                  <div>
                    <div className="hl-thread">The workshop</div>
                    <div className="hl-stitch" />
                    <p className="hl-serif fs-3 mb-0" style={{ maxWidth: '20rem', lineHeight: 1.2 }}>
                      Every garment starts with your measurements, not a size label.
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-2 hl-thread">
                    <IconifyIcon icon="solar:map-point-bold" /> Ajuwon Market, Lagos
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Offers — tailoring first */}
      <section className="hl-section" id="tailoring">
        <Container>
          <div className="text-center mb-5">
            <div className="hl-kicker">What we do</div>
            <h2 className="hl-h2 hl-serif mt-2">Tailoring is the work. The shop is the extra.</h2>
            <p className="hl-sub mx-auto mt-2">
              Most of what we make is cut for one person. When a piece is ready to wear,
              it goes to the shop.
            </p>
          </div>
          <Row className="g-4">
            {offers.map((o) => (
              <Col md={4} key={o.title}>
                <div className={`hl-offer ${o.feature ? 'hl-offer-feature' : ''}`}>
                  <div className="hl-offer-ico"><IconifyIcon icon={o.icon} /></div>
                  <div className="hl-offer-badge mb-1">{o.badge}</div>
                  <h3 className="hl-serif">{o.title}</h3>
                  <p className="hl-offer-desc mt-2">{o.desc}</p>
                  <a href="#contact" className={`hl-btn mt-2 ${o.feature ? 'hl-btn-primary' : 'hl-btn-ghost'}`}>
                    {o.cta} <IconifyIcon icon="solar:arrow-right-linear" />
                  </a>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Process */}
      <section className="hl-section hl-section-alt" id="craft">
        <Container>
          <Row className="g-5 align-items-center">
            <Col lg={5}>
              <div className="hl-kicker">Our craft</div>
              <h2 className="hl-h2 hl-serif mt-2">From measurement to finished piece</h2>
              <p className="hl-sub mt-2">
                Four steps, the same way a good tailor has always worked. No rushing the fit.
              </p>
              <a href="#contact" className="hl-btn hl-btn-primary mt-3">
                <IconifyIcon icon="solar:calendar-mark-bold" /> Start your piece
              </a>
            </Col>
            <Col lg={7}>
              {steps.map((s) => (
                <div className="hl-step d-flex gap-3" key={s.n}>
                  <div className="hl-step-n">{s.n}</div>
                  <div>
                    <h4>{s.t}</h4>
                    <p>{s.d}</p>
                  </div>
                </div>
              ))}
            </Col>
          </Row>
        </Container>
      </section>

      {/* Heritage */}
      <section className="hl-section" id="heritage">
        <Container>
          <Row className="g-5 align-items-center">
            <Col lg={6} className="order-lg-2">
              <div className="hl-kicker">Heritage</div>
              <h2 className="hl-h2 hl-serif mt-2">African cloth, a modern cut.</h2>
              <p className="hl-sub mt-2">
                We work with Ankara, Adire and Aso-oke, fabrics with a long story behind them,
                and cut them into menswear a man can wear to work, to a wedding, or to Friday
                prayers. The result is yours to wear with pride.
              </p>
              <ul className="list-unstyled mt-3">
                {['Hand-finished seams and trims', 'Fabric sourced and tracked by the metre', 'Your measurements kept for repeat orders'].map((t) => (
                  <li key={t} className="d-flex align-items-center gap-2 py-1" style={{ color: '#44403c' }}>
                    <IconifyIcon icon="solar:check-circle-bold" style={{ color: 'var(--hl-amber-2)' }} /> {t}
                  </li>
                ))}
              </ul>
            </Col>
            <Col lg={6} className="order-lg-1">
              <div className="hl-quote">
                <p className="hl-serif fst-italic">
                  “A garment should fit the man, carry his culture, and last him years.
                  That is the whole job.”
                </p>
                <div className="d-flex align-items-center gap-2 mt-2" style={{ color: '#78716c' }}>
                  <IconifyIcon icon="solar:user-bold" /> The Herit Clothing workshop
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Pieces */}
      <section className="hl-section hl-section-alt" id="pieces">
        <Container>
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-4">
            <div>
              <div className="hl-kicker">Pieces</div>
              <h2 className="hl-h2 hl-serif mt-2">A look at the work</h2>
            </div>
            <a href="#contact" className="hl-btn hl-btn-ghost">Enquire about a piece <IconifyIcon icon="solar:arrow-right-linear" /></a>
          </div>
          <Row className="g-4">
            {tiles.map((t) => (
              <Col sm={6} lg={3} key={t.s}>
                <div className={`hl-tile ${t.c}`}>
                  <div><span>{t.s}</span><small>{t.l}</small></div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Contact */}
      <section className="hl-section" id="contact">
        <Container>
          <Row className="g-5">
            <Col lg={5}>
              <div className="hl-kicker">Get in touch</div>
              <h2 className="hl-h2 hl-serif mt-2">Ready for something cut to fit you?</h2>
              <p className="hl-sub mt-2">
                Book a fitting at the workshop, or send a message and we will talk through
                the style, cloth and timing. We usually reply the same day.
              </p>
              <ul className="list-unstyled mt-4">
                <li className="d-flex align-items-center gap-2 py-2">
                  <span className="hl-contact-ico"><IconifyIcon icon="solar:map-point-bold" /></span>
                  Ajuwon Market, Lagos, Nigeria
                </li>
                <li className="d-flex align-items-center gap-2 py-2">
                  <span className="hl-contact-ico"><IconifyIcon icon="solar:letter-bold" /></span>
                  hello@heritclothing.com
                </li>
                <li className="d-flex align-items-center gap-2 py-2">
                  <span className="hl-contact-ico"><IconifyIcon icon="mdi:whatsapp" /></span>
                  Message us on WhatsApp
                </li>
              </ul>
            </Col>
            <Col lg={7}>
              <div className="hl-form-card">
                <ContactForm />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="hl-footer">
        <Container>
          <Row className="g-4">
            <Col lg={4} md={6}>
              <div className="hl-foot-brand">Herit<span>Clothing</span></div>
              <p className="mt-2" style={{ maxWidth: '20rem' }}>
                A tailoring house for African menswear. Measured, cut and sewn in Lagos.
              </p>
              <div className="d-flex gap-2 mt-3">
                <a href="#contact" className="hl-social"><IconifyIcon icon="solar:instagram-bold" /></a>
                <a href="#contact" className="hl-social"><IconifyIcon icon="mdi:facebook" /></a>
                <a href="#contact" className="hl-social"><IconifyIcon icon="mdi:whatsapp" /></a>
              </div>
            </Col>
            <Col lg={2} md={6}>
              <h6>Tailoring</h6>
              <a href="#tailoring">Bespoke</a>
              <a href="#tailoring">Made-to-measure</a>
              <a href="#craft">Our craft</a>
              <a href="#contact">Book a fitting</a>
            </Col>
            <Col lg={2} md={6}>
              <h6>Shop</h6>
              <a href="#pieces">Ready to wear</a>
              <a href="#heritage">Fabrics</a>
              <a href="#contact">Stockist enquiries</a>
            </Col>
            <Col lg={2} md={6}>
              <h6>Company</h6>
              <a href="#heritage">Our story</a>
              <a href="#contact">Contact</a>
              <Link to="/auth/sign-in">Staff login</Link>
            </Col>
            <Col lg={2} md={6}>
              <h6>Visit</h6>
              <span style={{ color: '#a8a29e', fontSize: '.92rem' }}>Ajuwon Market<br />Lagos, Nigeria</span>
            </Col>
          </Row>
          <div className="hl-foot-bottom d-flex justify-content-between flex-wrap gap-2">
            <span>© {new Date().getFullYear()} Herit Clothing. All rights reserved.</span>
            <span>Tailored in Lagos, Nigeria</span>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;
