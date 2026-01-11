const productsFixture = [
  {
    id: 101,
    name: 'EVA Core',
    category: 'Components',
    status: 'active',
    isActive: true,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-18T12:00:00.000Z',
    price: 1200,
    stock: 5,
    defaultValue: 1200,
    storageQuantity: 5,
    unitOfMeasure: 'UN',
  },
];

const ordersFixture = [
  {
    id: 44,
    customer: 'NERV HQ',
    date: '2025-01-18T09:30:00.000Z',
    total: 9000,
    status: 'processing',
    items: 2,
  },
];

const reportsFixture = [
  {
    id: 901,
    title: 'EVA-01 Inventory Pulse',
    description: 'Inventory health and restock priorities.',
    date: '2025-01-20',
    type: 'Inventory',
    icon: 'bar-chart-2',
  },
];

const loginFixture = {
  token: 'fake.jwt.token',
  expiresIn: 3600,
  enterpriseId: 'eva-01',
};

const stubDashboardRequests = () => {
  cy.intercept('POST', '**/Product/GetProductsByFilter/**', {
    statusCode: 200,
    body: productsFixture,
  }).as('getProducts');

  cy.intercept('POST', '**/Order/GetOrdersByFilter/**', {
    statusCode: 200,
    body: ordersFixture,
  }).as('getOrders');
};

const stubReportsRequests = () => {
  cy.intercept('GET', '**/reports', {
    statusCode: 200,
    body: reportsFixture,
  }).as('getReports');
};

const stubLoginSuccess = () => {
  cy.intercept('GET', '**/User/LogInto/**', {
    statusCode: 200,
    body: loginFixture,
  }).as('login');
};

const visitAndLogin = () => {
  stubLoginSuccess();
  stubDashboardRequests();
  stubReportsRequests();

  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
    },
  });

  cy.get('[data-testid="login-username"]', { timeout: 10000 }).should('be.visible').type('shinji');
  cy.get('[data-testid="login-password"]').type('unit-01');
  cy.get('[data-testid="login-submit"]').click();

  cy.wait('@login');
  cy.wait('@getProducts');
  cy.wait('@getOrders');
};

describe('Frontend E2E', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it('logs in and navigates the dashboard', () => {
    visitAndLogin();
    cy.contains('COMMAND CENTER', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="sidebar-nav-products"]').click();
    cy.contains('PRODUCT INVENTORY', { timeout: 10000 }).should('be.visible');
  });

  it('navigates across modules with stubbed data', () => {
    visitAndLogin();

    cy.get('[data-testid="sidebar-nav-orders"]').click();
    cy.wait('@getOrders');
    cy.contains('ORDER TRACKING', { timeout: 10000 }).should('be.visible');
    cy.contains('#44').should('be.visible');

    cy.get('[data-testid="sidebar-nav-reports"]').click();
    cy.wait('@getReports');
    cy.contains('REPORTS & ANALYTICS', { timeout: 10000 }).should('be.visible');
    cy.contains(reportsFixture[0].title).should('be.visible');

    cy.get('[data-testid="sidebar-nav-customers"]').click();
    cy.contains('CUSTOMER MANAGEMENT', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="sidebar-nav-employees"]').click();
    cy.contains('EMPLOYEE MANAGEMENT', { timeout: 10000 }).should('be.visible');
  });

  it('logs out from the sidebar', () => {
    visitAndLogin();
    cy.get('[data-testid="sidebar-logout"]').click();
    cy.get('[data-testid="login-username"]').should('be.visible');
  });

  it('surfaces login errors', () => {
    cy.intercept('GET', '**/User/LogInto/**', {
      statusCode: 401,
      body: 'Invalid credentials',
      headers: {
        'content-type': 'text/plain',
      },
    }).as('loginFailed');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.get('[data-testid="login-username"]', { timeout: 10000 }).should('be.visible').type('bad-user');
    cy.get('[data-testid="login-password"]').type('bad-pass');
    cy.get('[data-testid="login-submit"]').click();

    cy.wait('@loginFailed');
    cy.get('[data-testid="login-error"]').should('contain', 'Invalid credentials');
  });
});
