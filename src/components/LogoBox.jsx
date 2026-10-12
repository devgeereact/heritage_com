import logoSm from '@/assets/images/logo-sm.svg';
import { Link } from 'react-router-dom';

/** Live text stays legible at sidebar height; compact mode keeps the mark. */
const LogoBox = () => (
  <div className="logo-box">
    {['dark', 'light'].map((theme) => (
      <Link key={theme} to="/" className={`logo-${theme}`} aria-label="Herit Clothing home">
        <img src={logoSm} width={28} height={26} className="logo-sm" alt="" />
        <span className="logo-lg hd-brand-lockup">
          <img src={logoSm} width={28} height={32} alt="" />
          <span>HeritOS</span>
        </span>
      </Link>
    ))}
  </div>
);
export default LogoBox;
