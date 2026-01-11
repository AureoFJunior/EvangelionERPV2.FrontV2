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
  },
  video: false,
});
