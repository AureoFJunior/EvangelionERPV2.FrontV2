const { defineConfig } = require('cypress');

const resolveBaseUrl = () => {
  if (process.env.CYPRESS_BASE_URL) {
    return process.env.CYPRESS_BASE_URL;
  }

  const port =
    process.env.CYPRESS_PORT ||
    process.env.EXPO_WEB_PORT ||
    process.env.EXPO_DEV_SERVER_PORT ||
    '8081';

  return `http://localhost:${port}`;
};

module.exports = defineConfig({
  e2e: {
    baseUrl: resolveBaseUrl(),
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    env: {
      API_BASE_URL:
        process.env.CYPRESS_API_BASE_URL ||
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        'http://localhost:5002/api/v1',
      ADMIN_USERNAME: process.env.CYPRESS_ADMIN_USERNAME || 'admin',
      ADMIN_PASSWORD: process.env.CYPRESS_ADMIN_PASSWORD || '1234',
    },
  },
  video: false,
});
