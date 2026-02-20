/**
 * Mock for react-router-dom in Vitest tests
 */
import { vi } from 'vitest';
import React from 'react';

export const __mockNavigate = vi.fn();
export const __mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

export const useNavigate = () => __mockNavigate;
export const useLocation = () => __mockLocation;
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), vi.fn()];
export const Link = ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children);
export const NavLink = ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children);
export const BrowserRouter = ({ children }) => children;
export const MemoryRouter = ({ children }) => children;
export const Routes = ({ children }) => children;
export const Route = () => null;
export const Navigate = () => null;
export const Outlet = () => null;
