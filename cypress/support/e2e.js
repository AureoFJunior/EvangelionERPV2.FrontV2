const resetStorage = (win) => {
  if (win?.localStorage) {
    win.localStorage.clear();
  }
  if (win?.sessionStorage) {
    win.sessionStorage.clear();
  }
};

Cypress.on('window:before:load', (win) => {
  resetStorage(win);
});

beforeEach(() => {
  cy.clearCookies();
});
