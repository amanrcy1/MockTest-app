const React = require('react');

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/', search: '', hash: '', state: null };

module.exports = {
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  Link: ({ children, to, ...rest }) => React.createElement('a', { href: to, ...rest }, children),
  NavLink: ({ children, to, ...rest }) => React.createElement('a', { href: to, ...rest }, children),
  Navigate: ({ to }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }),
  MemoryRouter: ({ children }) => React.createElement('div', null, children),
  BrowserRouter: ({ children }) => React.createElement('div', null, children),
  Routes: ({ children }) => React.createElement('div', null, children),
  Route: () => null,
  // Expose for test overrides
  __mockNavigate: mockNavigate,
  __mockLocation: mockLocation,
};
