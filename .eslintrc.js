module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off', // Disabled - can be enabled later for gradual adoption
    'react-hooks/exhaustive-deps': 'warn',
  },
};
