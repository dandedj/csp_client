import { Navbar, Nav, Container } from 'react-bootstrap';
import { NavLink, Link } from 'react-router-dom';

/**
 * Site header. Uses react-bootstrap's Navbar (its collapse is handled in React,
 * so no CDN Bootstrap JS is required) with NavLink active states.
 */
export default function Header() {
  return (
    <Navbar expand="md" className="site-header" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to="/" className="site-brand">
          <img
            src="/cspa-logo.png"
            alt="Cancer Survivors Park Alliance"
            className="site-brand__logo"
          />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="site-nav" />
        <Navbar.Collapse id="site-nav">
          <Nav className="ms-auto">
            <Nav.Link as={NavLink} to="/" end>
              Map
            </Nav.Link>
            <Nav.Link as={NavLink} to="/plaques">
              All plaques
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
