import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import logoSm from '@/assets/images/logo-sm.svg';
import { Link } from 'react-router-dom';
const LogoBox = () => {
  return <div className="logo-box">
      <Link to="/" className="logo-dark">
        <img src={logoSm} width={28} height={26} className="logo-sm" alt="logo sm" />
        <img src={logoDark} height={24} width={112} className="logo-lg" alt="logo dark" />
      </Link>
      <Link to="/" className="logo-light">
        <img src={logoSm} width={28} height={26} className="logo-sm" alt="logo sm" />
        <img src={logoLight} height={24} width={112} className="logo-lg" alt="logo light" />
      </Link>
    </div>;
};
export default LogoBox;