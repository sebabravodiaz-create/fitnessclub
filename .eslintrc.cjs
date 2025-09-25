/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
};

try {
  require.resolve('eslint-config-next');
  config.extends = ['next/core-web-vitals', 'next/typescript'];
} catch (error) {
  console.warn('eslint-config-next no disponible, usando reglas básicas.');
  config.extends = ['eslint:recommended'];
  config.env = {
    browser: true,
    node: true,
    es2021: true,
  };
  config.parserOptions = {
    ecmaVersion: 2021,
    sourceType: 'module',
  };
}

module.exports = config;
