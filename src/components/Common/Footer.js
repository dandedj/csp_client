import packageJson from '../../../package.json';

export default function Footer() {
  return (
    <footer className="site-footer mt-auto">
      <div className="container site-footer__inner">
        <span className="site-footer__place">Cancer Survivors Park · Greenville, SC</span>
        <span className="wayfinding site-footer__version">v{packageJson.version}</span>
      </div>
    </footer>
  );
}
