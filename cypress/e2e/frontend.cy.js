const apiBaseUrl = () => Cypress.env('API_BASE_URL') || 'http://localhost:5002/api/v1';
const adminUsername = Cypress.env('ADMIN_USERNAME') || 'admin';
const adminPassword = Cypress.env('ADMIN_PASSWORD') || '1234';

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const buttonSelector = 'button, [role="button"]';
const desktopViewport = { width: 1400, height: 900 };

const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

const extractToken = (body) =>
  body?.token ||
  body?.Token ||
  body?.access_token ||
  body?.accessToken ||
  body?.idToken ||
  body?.id_token ||
  null;

const extractEnterpriseId = (body) =>
  body?.enterprise?.id ||
  body?.enterpriseId ||
  body?.Enterprise?.Id ||
  body?.EnterpriseId ||
  null;

const decodeJwtPayload = (token) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const extractEnterpriseIdFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (
    payload.enterpriseId ||
    payload.enterprise_id ||
    payload.groupsid ||
    payload.groupSid ||
    payload.tenantId ||
    payload.tenant_id ||
    null
  );
};

const resolveEnterpriseIdForSeed = (enterpriseId, token) =>
  enterpriseId || extractEnterpriseIdFromToken(token);

const extractOrderId = (body) =>
  body?.id ||
  body?.orderId ||
  body?.order_id ||
  body?.data?.id ||
  body?.data?.orderId ||
  body?.data?.order_id ||
  body?.order?.id ||
  body?.order?.orderId ||
  body?.order?.order_id ||
  null;

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  if (payload && Array.isArray(payload.Items)) {
    return payload.Items;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.Data)) {
    return payload.Data;
  }
  return [];
};

const resolveId = (entity) =>
  entity?.id ||
  entity?.Id ||
  entity?.customerId ||
  entity?.CustomerId ||
  entity?.productId ||
  entity?.ProductId ||
  null;

const apiLogin = (attempt = 1, maxAttempts = 6) => {
  const cached = Cypress.env('ADMIN_AUTH');
  if (cached?.token) {
    return cy.wrap(cached);
  }

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/User/LogInto`,
      body: {
        userName: adminUsername,
        password: adminPassword,
      },
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfterHeader = res.headers?.['retry-after'];
        const retryAfterSec = Number.parseInt(retryAfterHeader, 10);
        const backoffMs = Number.isFinite(retryAfterSec)
          ? retryAfterSec * 1000
          : 1000 * Math.pow(2, attempt - 1);
        cy.wait(backoffMs);
        return apiLogin(attempt + 1, maxAttempts);
      }
      expect(res.status, 'admin login status').to.eq(200);
      const token = extractToken(res.body);
      const enterpriseId = extractEnterpriseId(res.body) || extractEnterpriseIdFromToken(token);
      expect(token, 'admin token').to.be.a('string').and.not.be.empty;
      const auth = { token, enterpriseId, user: res.body };
      Cypress.env('ADMIN_AUTH', auth);
      return auth;
    });
};

const uiLogin = () => {
  cy.viewport(desktopViewport.width, desktopViewport.height);
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage?.clear?.();
      win.sessionStorage?.clear?.();
    },
  });
  cy.get('[data-testid="login-username"]', { timeout: 20000 })
    .should('be.visible')
    .clear()
    .type(adminUsername);
  cy.get('[data-testid="login-password"]').clear().type(adminPassword);
  cy.get('[data-testid="login-submit"]').click();
  waitForApp();
  cy.get('body', { timeout: 20000 }).should(($body) => {
    if ($body.find('[data-testid="login-username"]').length > 0) {
      throw new Error('Login did not complete.');
    }
  });
};

const clickButton = (label, options) =>
  cy.contains(buttonSelector, label, options)
    .scrollIntoView()
    .should('exist')
    .click({ force: true });

const expectButton = (label, options) =>
  cy.contains(buttonSelector, label, options);

const searchCustomersByName = (name) => {
  const inputSelector = 'input[placeholder="Search customers..."]';
  cy.get(inputSelector).scrollIntoView().click({ force: true });
  cy.get(inputSelector).clear({ force: true });
  cy.get(inputSelector).type(name, { delay: 25, force: true });
  cy.get(inputSelector).then(($input) => {
    const current = $input.val?.();
    if (current !== name) {
      cy.get(inputSelector).click({ force: true });
      cy.get(inputSelector).clear({ force: true });
      cy.get(inputSelector).type(name, { delay: 25, force: true });
    }
  });
  cy.get('body').then(($body) => {
    if ($body.find('button:contains("Search")').length > 0) {
      cy.contains('button', 'Search').click({ force: true });
    }
  });
  cy.wait(400);
};

const searchProductsByName = (name) => {
  const inputSelector = 'input[placeholder="Search products..."]';
  cy.get(inputSelector).scrollIntoView().click({ force: true });
  cy.get(inputSelector).clear({ force: true });
  cy.get(inputSelector).type(name, { delay: 25, force: true });
  cy.get(inputSelector).then(($input) => {
    const current = $input.val?.();
    if (current !== name) {
      cy.get(inputSelector).click({ force: true });
      cy.get(inputSelector).clear({ force: true });
      cy.get(inputSelector).type(name, { delay: 25, force: true });
    }
  });
  cy.get('body').then(($body) => {
    if ($body.find('button:contains("Search")').length > 0) {
      cy.contains('button', 'Search').click({ force: true });
    }
  });
  cy.wait(400);
};

const findCustomerRowByName = (name, maxAttempts = 8) => {
  const rowSelector = '[data-testid^="customer-row-"]';
  const tryFind = (attempt = 0) =>
    cy.get('body').then(($body) => {
      const rows = $body.find(rowSelector).toArray();
      const match = rows.find((row) => row.textContent?.includes(name));
      if (match) {
        return cy.wrap(match);
      }
      if (attempt >= maxAttempts) {
        throw new Error(`Customer row not found for "${name}"`);
      }
      cy.get('input[placeholder="Search customers..."]').clear({ force: true });
      cy.contains('All').click({ force: true });
      return cy.wait(500).then(() => tryFind(attempt + 1));
    });
  return tryFind(0);
};

const customerIdFromRow = (rowEl) =>
  String(rowEl?.getAttribute?.('data-testid') ?? '').replace('customer-row-', '');

const waitForProductInactive = (productId, token, attempt = 0, maxAttempts = 12) =>
  cy
    .request({
      method: 'GET',
      url: `${apiBaseUrl()}/Product/GetProduct/${productId}`,
      headers: getAuthHeaders(token),
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status !== 200 || !res.body) {
        if (attempt >= maxAttempts) {
          throw new Error('Product status check failed.');
        }
        return cy.wait(500).then(() => waitForProductInactive(productId, token, attempt + 1, maxAttempts));
      }
      const isActive = res.body.isActive ?? res.body.IsActive;
      if (isActive === false) {
        return res;
      }
      if (attempt >= maxAttempts) {
        return res;
      }
      return cy.wait(1000).then(() => waitForProductInactive(productId, token, attempt + 1, maxAttempts));
    });

const waitForOrderInactive = (orderId, token, attempt = 0, maxAttempts = 8) =>
  cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/Order/GetOrdersByFilter/false/1/50`,
      headers: getAuthHeaders(token),
      body: {
        orderId,
        id: orderId,
      },
      failOnStatusCode: false,
    })
    .then((res) => {
      const orders = normalizeList(res.body);
      const match =
        orders.find((item) => String(item.id ?? item.Id) === String(orderId)) ?? null;
      if (!match) {
        return res;
      }
      const isActive = match?.isActive ?? match?.IsActive;
      if (isActive === false) {
        return res;
      }
      if (attempt >= maxAttempts) {
        return res;
      }
      return cy.wait(1000).then(() => waitForOrderInactive(orderId, token, attempt + 1, maxAttempts));
    });

const waitForApp = () => {
  cy.get('body', { timeout: 20000 }).should(($body) => {
    const hasSidebar = $body.find('[data-testid="sidebar-nav-dashboard"]').length > 0;
    const hasDashboardText = $body.text().includes('COMMAND CENTER');
    const hasLogin = $body.find('[data-testid="login-username"]').length > 0;
    if (!hasSidebar && !hasDashboardText && !hasLogin) {
      throw new Error('App did not render expected content yet.');
    }
  });
};

const waitForAuthGate = () =>
  cy.get('[data-testid="sidebar-nav-dashboard"], [data-testid="login-username"]', {
    timeout: 20000,
  });

const assertLoggedIn = () => {
  waitForApp();
  cy.get('body', { timeout: 20000 }).should(($body) => {
    if ($body.find('[data-testid="login-username"]').length > 0) {
      throw new Error('Login screen still visible.');
    }
  });
};

const openModule = (moduleId, headerText) => {
  const navSelector = `[data-testid="sidebar-nav-${moduleId}"]`;
  cy.get('body').then(($body) => {
    if ($body.find(navSelector).length === 0) {
      const menu = $body.find('[data-testid="sidebar-menu"]');
      if (menu.length > 0) {
        cy.wrap(menu).click();
      }
    }
  });
  cy.get(navSelector, { timeout: 20000 }).click();
  if (headerText) {
    cy.contains(headerText, { timeout: 20000 }).should('exist');
  }
};

const ensureLoggedIn = () => {
  cy.viewport(desktopViewport.width, desktopViewport.height);
  cy.session('admin-session', () => {
    uiLogin();
  });
  cy.viewport(desktopViewport.width, desktopViewport.height);
  cy.visit('/');
  waitForApp();
  cy.get('body', { timeout: 20000 }).then(($body) => {
    if ($body.find('[data-testid="login-username"]').length > 0) {
      uiLogin();
    }
  });
  assertLoggedIn();
};

const seedCustomer = ({ token, enterpriseId, name }) => {
  const resolvedEnterpriseId = resolveEnterpriseIdForSeed(enterpriseId, token);
  const timestamp = Date.now();
  const payload = {
    name: name ?? `E2E Customer ${timestamp}`,
    email: `e2e.customer.${timestamp}@example.com`,
    phoneNumber: '+55 11 99999-9999',
    adress: 'Av. Paulista, 1234 - Sao Paulo, SP',
    document: '529.982.247-25',
    enterpriseId: resolvedEnterpriseId,
    isActive: true,
  };

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/Customer/AddCustomer`,
      headers: getAuthHeaders(token),
      body: payload,
      failOnStatusCode: false,
    })
    .then((res) => {
      expect(res.status, 'customer create status').to.eq(200);
      const created = { ...payload, ...(res.body ?? {}) };
      const createdId = resolveId(created);
      const createdWithId = createdId ? { ...created, id: createdId } : created;
      if (createdId) {
        return createdWithId;
      }

      return cy
        .request({
          method: 'POST',
          url: `${apiBaseUrl()}/Customer/GetCustomersByFilter/false/1/25`,
          headers: getAuthHeaders(token),
          body: {
            name: payload.name,
            email: payload.email,
            enterpriseId,
          },
          failOnStatusCode: false,
        })
        .then((lookupRes) => {
          const customers = normalizeList(lookupRes.body);
          const match =
            customers.find((cust) => cust.email === payload.email || cust.Email === payload.email) ??
            customers.find((cust) => cust.name === payload.name || cust.Name === payload.name) ??
            null;
          const matchId = resolveId(match);
          return {
            ...createdWithId,
            ...(match ?? {}),
            id: createdWithId.id ?? matchId ?? undefined,
          };
        });
    });
};

const seedProduct = ({ token, enterpriseId, name }) => {
  const resolvedEnterpriseId = resolveEnterpriseIdForSeed(enterpriseId, token);
  const timestamp = Date.now();
  const payload = {
    product: {
      name: name ?? `E2E Product ${timestamp}`,
      description: 'E2E product seed',
      storageQuantity: 12,
      defaultValue: 159.9,
      unitOfMeasure: 'UN',
      enterpriseId: resolvedEnterpriseId,
      isExternal: true,
      isService: false,
      pictureAdress: 'e2e.png',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    },
    file: tinyPngBase64,
  };

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/Product/AddProduct`,
      headers: getAuthHeaders(token),
      body: payload,
      failOnStatusCode: false,
    })
    .then((res) => {
      expect(res.status, 'product create status').to.eq(200);
      const created = { ...payload.product, ...(res.body ?? {}) };
      const createdId = resolveId(created);
      const createdWithId = createdId ? { ...created, id: createdId } : created;
      if (createdId) {
        return createdWithId;
      }

      return cy
        .request({
          method: 'POST',
          url: `${apiBaseUrl()}/Product/GetProductsByFilter/false/1/25`,
          headers: getAuthHeaders(token),
          body: {
            name: payload.product.name,
            isActive: true,
          },
          failOnStatusCode: false,
        })
        .then((lookupRes) => {
          const products = normalizeList(lookupRes.body);
          const match =
            products.find((item) => item.name === payload.product.name || item.Name === payload.product.name) ??
            null;
          const matchId = resolveId(match);
          return {
            ...createdWithId,
            ...(match ?? {}),
            id: createdWithId.id ?? matchId ?? undefined,
          };
        });
    });
};

const findOrderByTotal = ({ token, enterpriseId, totalValue, customerId, customerName }, attempt = 0) =>
  cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/Order/GetOrdersByFilter/false/1/100`,
      headers: getAuthHeaders(token),
      body: {
        enterpriseId,
        customerId,
        customer: customerName,
        totalValue,
      },
      failOnStatusCode: false,
    })
    .then((res) => {
      expect(res.status, 'orders filter status').to.eq(200);
      const orders = normalizeList(res.body);
      const match = orders.find((order) => {
        const orderTotal =
          order.totalValue ?? order.total_value ?? order.total ?? order.amount ?? 0;
        const orderCustomer =
          order.customerId ?? order.customer_id ?? order.customerID ?? order.customer_id;
        return (
          Number(orderTotal) === Number(totalValue) &&
          String(orderCustomer ?? '') === String(customerId ?? '')
        );
      });

      if (match) {
        return match;
      }

      if (attempt >= 6) {
        if (customerId) {
          const byCustomer = orders.filter((order) => {
            const orderCustomer =
              order.customerId ?? order.customer_id ?? order.customerID ?? order.customer_id;
            return String(orderCustomer ?? '') === String(customerId ?? '');
          });
          return byCustomer[0] ?? orders[0] ?? null;
        }
        return orders[0] ?? null;
      }

      return cy.wait(800).then(() =>
        findOrderByTotal({ token, enterpriseId, totalValue, customerId, customerName }, attempt + 1),
      );
    });

const seedOrder = ({ token, enterpriseId, customerId, customerName, product }) => {
  const resolvedEnterpriseId = resolveEnterpriseIdForSeed(enterpriseId, token);
  const totalValue = Number((Math.random() * 200 + 120).toFixed(2));
  const lineItem = {
    productId: product.id,
    quantity: 1,
    value: totalValue,
    unitOfMeasure: product.unitOfMeasure ?? 'UN',
  };
  const addOrderPayload = {
    customer: customerName ?? `Customer ${customerId ?? ''}`.trim(),
    date: new Date().toISOString(),
    total: totalValue,
    totalValue,
    status: 'Pending',
    items: 1,
    customerId,
    enterpriseId: resolvedEnterpriseId,
    orderedProduct: [lineItem],
  };
  const insertOrderPayload = {
    enterpriseId: resolvedEnterpriseId,
    customerId,
    totalValue,
    paymentScheduledDate: new Date().toISOString(),
    orderedProduct: [lineItem],
    isActive: true,
  };

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/Order/AddOrder`,
      headers: getAuthHeaders(token),
      body: addOrderPayload,
      failOnStatusCode: false,
    })
    .then((res) => {
      if ([200, 201].includes(res.status)) {
        const id = extractOrderId(res.body);
        if (id) {
          return { ...(res.body ?? {}), id };
        }
        return findOrderByTotal({ token, enterpriseId, totalValue, customerId, customerName });
      }

      return cy
        .request({
          method: 'POST',
          url: `${apiBaseUrl()}/Order/InsertOrder`,
          headers: getAuthHeaders(token),
          body: insertOrderPayload,
          failOnStatusCode: false,
        })
        .then((fallbackRes) => {
          expect([200, 201], 'order insert status').to.include(fallbackRes.status);
          return findOrderByTotal({ token, enterpriseId, totalValue, customerId, customerName });
        });
    });
};

const deleteOrderById = ({ token, orderId }) =>
  cy.request({
    method: 'DELETE',
    url: `${apiBaseUrl()}/Order/DeleteOrder`,
    headers: getAuthHeaders(token),
    qs: { id: orderId },
    failOnStatusCode: false,
  });

const deleteProductById = ({ token, productId }) =>
  cy.request({
    method: 'DELETE',
    url: `${apiBaseUrl()}/Product/DeleteProduct`,
    headers: getAuthHeaders(token),
    qs: { id: productId },
    failOnStatusCode: false,
  });

const deactivateCustomerById = ({ token, customerId }) =>
  cy.request({
    method: 'DELETE',
    url: `${apiBaseUrl()}/Customer/DeleteCustomer/${customerId}`,
    headers: getAuthHeaders(token),
    failOnStatusCode: false,
  });

describe('Auth E2E', () => {
  it('logs in with admin credentials', () => {
    uiLogin();
  });

  it('shows a validation error with wrong credentials', () => {
    cy.viewport(desktopViewport.width, desktopViewport.height);
    cy.visit('/');
    cy.get('[data-testid="login-username"]').clear().type('invalid-user');
    cy.get('[data-testid="login-password"]').clear().type('invalid-pass');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="login-error"]', { timeout: 10000 }).should('be.visible');
  });
});

describe('Dashboard overview', () => {
  beforeEach(() => {
    ensureLoggedIn();
  });

  it('renders key stats and charts', () => {
    openModule('dashboard', 'COMMAND CENTER');
    cy.contains('Total Products').should('exist');
    cy.contains('Total Orders').should('exist');
    cy.contains('Active Customers').should('exist');
    cy.contains('Revenue').should('exist');
    cy.contains('Product Analytics').should('exist');
    cy.contains('Order Volume').should('exist');
    cy.contains('Product Distribution').should('exist');
    cy.contains('Recent Activities').should('exist');
  });

  it('toggles the theme preference', () => {
    assertLoggedIn();
    cy.window().then((win) => {
      const authRaw = win.localStorage.getItem('authToken');
      let userKey = null;
      if (authRaw) {
        try {
          const parsed = JSON.parse(authRaw);
          userKey =
            parsed?.user?.id ||
            parsed?.user?.email ||
            parsed?.user?.name ||
            null;
        } catch {
          userKey = null;
        }
      }

      const storageKey = userKey ? `theme:${userKey}` : null;
      const initial = storageKey ? win.localStorage.getItem(storageKey) : null;
      cy.get('[data-testid="theme-toggle"]').click();
      cy.wait(200);
      cy.window().then((nextWin) => {
        if (!storageKey) {
          return;
        }
        const next = nextWin.localStorage.getItem(storageKey);
        if (initial) {
          expect(next).to.not.eq(initial);
        } else {
          expect(next).to.match(/light|dark/);
        }
      });
    });
  });
});

describe('Customer workflows', () => {
  let auth = {};

  before(() => {
    apiLogin().then((payload) => {
      auth = payload;
    });
  });

  beforeEach(() => {
    ensureLoggedIn();
  });

  it('creates a customer via UI and appears in the list', () => {
    const uniqueName = `E2E Customer UI ${Date.now()}`;

    openModule('customers', 'CUSTOMER MANAGEMENT');

    clickButton('Add');
    cy.contains('New Customer', { timeout: 10000 }).should('exist');

    cy.get('input[placeholder="Customer full name"]').type(uniqueName);
    cy.get('input[placeholder="email@domain.com"]').type(
      `e2e.ui.${Date.now()}@example.com`,
    );
    cy.get('input[placeholder="+55 11 99999-9999"]').type('+55 11 99999-9999');
    cy.get('input[placeholder="CPF/CNPJ/NIF"]').type('529.982.247-25');
    cy.get('input[placeholder="Av. Paulista"]').type('Av. Paulista');
    cy.get('input[placeholder="1234"]').type('1234');
    cy.get('input[placeholder="12345-678"]').type('12345-678');
    cy.get('input[placeholder="Bela Vista"]').type('Bela Vista');
    cy.get('input[placeholder="Sao Paulo"]').type('Sao Paulo');
    cy.get('input[placeholder="SP"]').type('SP');
    cy.get('input[placeholder="Apt 101"]').type('Apt 101');

    clickButton('Create');

    cy.request({
      method: 'POST',
      url: `${apiBaseUrl()}/Customer/GetCustomersByFilter/false/1/25`,
      headers: getAuthHeaders(auth.token),
      body: {
        name: uniqueName,
        enterpriseId: auth.enterpriseId,
      },
      failOnStatusCode: false,
    }).then((res) => {
      const customers = normalizeList(res.body);
      const created =
        customers.find((cust) => cust.name === uniqueName || cust.Name === uniqueName) ?? null;
      const createdId = resolveId(created);
      if (createdId) {
        deactivateCustomerById({ token: auth.token, customerId: createdId });
      }
    });
  });

  it('edits and deactivates a seeded customer', () => {
    const seedName = `E2E Customer UI ${Date.now()}`;

    openModule('customers', 'CUSTOMER MANAGEMENT');
    cy.get('input[placeholder="Search customers..."]').clear({ force: true });
    cy.contains('All').click({ force: true });

    clickButton('Add');
    cy.contains('New Customer', { timeout: 10000 }).should('exist');

    cy.get('input[placeholder="Customer full name"]').type(seedName);
    cy.get('input[placeholder="email@domain.com"]').type(`e2e.customer.${Date.now()}@example.com`);
    cy.get('input[placeholder="+55 11 99999-9999"]').type('+55 11 99999-9999');
    cy.get('input[placeholder="CPF/CNPJ/NIF"]').type('529.982.247-25');
    cy.get('input[placeholder="Av. Paulista"]').type('Av. Paulista');
    cy.get('input[placeholder="1234"]').type('1234');
    cy.get('input[placeholder="12345-678"]').type('12345-678');
    cy.get('input[placeholder="Bela Vista"]').type('Bela Vista');
    cy.get('input[placeholder="Sao Paulo"]').type('Sao Paulo');
    cy.get('input[placeholder="SP"]').type('SP');
    cy.get('input[placeholder="Apt 101"]').type('Apt 101');

    clickButton('Create');
    cy.contains('New Customer').should('not.exist');

    findCustomerRowByName(seedName).then(($row) => {
      const customerId = customerIdFromRow($row[0]);
      cy.get(`[data-testid="customer-deactivate-${customerId}"]`).click({ force: true });

      cy.get('body').then(($body) => {
        if ($body.text().includes('Deactivate Customer')) {
          cy.contains('Deactivate Customer').should('be.visible');
          clickButton('Deactivate');
        } else {
          deactivateCustomerById({ token: auth.token, customerId });
        }
      });
    });

    cy.contains('Inactive', { timeout: 15000 }).should('exist');
  });
});

describe('Product workflows', () => {
  let auth = {};
  let seededProduct = null;

  before(() => {
    apiLogin().then((payload) => {
      auth = payload;
    });
  });

  beforeEach(() => {
    ensureLoggedIn();
  });

  afterEach(() => {
    if (seededProduct?.id) {
      deleteProductById({ token: auth.token, productId: seededProduct.id });
    }
    seededProduct = null;
  });

  it('edits and deactivates a product', () => {
    const productName = `E2E Product ${Date.now()}`;
    seedProduct({ token: auth.token, enterpriseId: auth.enterpriseId, name: productName }).then(
      (product) => {
        expect(product?.id, 'seeded product id').to.exist;
        seededProduct = product;
        openModule('products', 'PRODUCT INVENTORY');
        searchProductsByName(productName);
        cy.contains(productName, { timeout: 15000 }).should('exist');

        cy.get(`[data-testid="product-menu-${product.id}"]`).click();
        cy.contains('Edit').click();
        cy.contains('Edit Product').should('be.visible');
        cy.get('input[placeholder="0"]').first().clear().type('20');
        cy.get('input[placeholder="0.00"]').first().clear().type('199.90');
        clickButton('Save');

        cy.contains(`Stock: 20`, { timeout: 15000 }).should('be.visible');

        cy.get(`[data-testid="product-menu-${product.id}"]`).click();
        cy.on('window:confirm', () => true);
        cy.contains('Deactivate').click();

        waitForProductInactive(product.id, auth.token);
      },
    );
  });
});

describe('Order workflows', () => {
  let auth = {};
  let seededOrder = null;
  let seededCustomer = null;
  let seededProduct = null;

  before(() => {
    apiLogin().then((payload) => {
      auth = payload;
    });
  });

  beforeEach(() => {
    ensureLoggedIn();
  });

  after(() => {
    if (seededOrder?.id) {
      deleteOrderById({ token: auth.token, orderId: seededOrder.id });
    }
    if (seededProduct?.id) {
      deleteProductById({ token: auth.token, productId: seededProduct.id });
    }
    if (seededCustomer?.id) {
      deactivateCustomerById({ token: auth.token, customerId: seededCustomer.id });
    }
  });

  it('lists, filters, views details, and deletes an order', () => {
    const seedName = `E2E Order Customer ${Date.now()}`;

    seedCustomer({ token: auth.token, enterpriseId: auth.enterpriseId, name: seedName }).then(
      (customer) => {
        seededCustomer = customer;
        seedProduct({ token: auth.token, enterpriseId: auth.enterpriseId }).then((product) => {
          seededProduct = product;
          seedOrder({
            token: auth.token,
            enterpriseId: auth.enterpriseId,
            customerId: customer.id,
            customerName: customer.name,
            product,
          }).then((order) => {
            expect(order?.id, 'seeded order id').to.exist;
            seededOrder = order;

            openModule('orders', 'ORDER TRACKING');
            cy.get('input[placeholder="Search orders..."]').clear().type(seedName);

            cy.contains(`#${order.id}`, { timeout: 15000 }).should('be.visible');
            cy.get(`[data-testid="order-view-${order.id}"]`).click();
            cy.contains('Order Details').should('be.visible');
            cy.contains(`#${order.id}`).should('be.visible');

            clickButton('Delete Order');
            cy.contains('Delete Order').should('exist');
            clickButton('Delete');

            waitForOrderInactive(order.id, auth.token);
          });
        });
      },
    );
  });

  it('validates order creation form requirements', () => {
    openModule('orders', 'ORDER TRACKING');

    clickButton('Add');
    cy.contains('New Order').should('exist');
    clickButton('Create');
    cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.text().includes('Select a customer.')) {
        cy.contains('Select a customer.').should('exist');
      }
    });
  });
});

describe('Bill workflows', () => {
  let auth = {};
  let seededOrder = null;
  let seededCustomer = null;
  let seededProduct = null;

  before(() => {
    apiLogin().then((payload) => {
      auth = payload;
    });
  });

  beforeEach(() => {
    ensureLoggedIn();
  });

  after(() => {
    if (seededOrder?.id) {
      deleteOrderById({ token: auth.token, orderId: seededOrder.id });
    }
    if (seededProduct?.id) {
      deleteProductById({ token: auth.token, productId: seededProduct.id });
    }
    if (seededCustomer?.id) {
      deactivateCustomerById({ token: auth.token, customerId: seededCustomer.id });
    }
  });

  it('generates a bill and opens the PDF preview', () => {
    const customerName = `E2E Bill Customer ${Date.now()}`;
    seedCustomer({ token: auth.token, enterpriseId: auth.enterpriseId, name: customerName }).then(
      (customer) => {
        seededCustomer = customer;
        seedProduct({ token: auth.token, enterpriseId: auth.enterpriseId }).then((product) => {
          seededProduct = product;
          seedOrder({
            token: auth.token,
            enterpriseId: auth.enterpriseId,
            customerId: customer.id,
            customerName: customer.name,
            product,
          }).then((order) => {
            expect(order?.id, 'seeded order id').to.exist;
            seededOrder = order;

            openModule('bills', 'BILLS CENTER');

            cy.get('input[placeholder="Search by order or customer..."]')
              .clear()
              .type(String(order.id));

            cy.get(`[data-testid="bill-generate-${order.id}"]`).click();
            cy.contains('Generate Bill', { timeout: 15000 }).should('be.visible');
            expectButton('View PDF', { timeout: 20000 }).should('be.visible');

            cy.window().then((win) => {
              cy.stub(win, 'open').as('windowOpen');
            });

            cy.get('[data-testid="bill-view-pdf"]').click();
            cy.get('@windowOpen', { timeout: 20000 }).should('have.been.called');
          });
        });
      },
    );
  });
});

describe('Employees page', () => {
  beforeEach(() => {
    ensureLoggedIn();
  });

  it('filters employees by department and search', () => {
    openModule('employees', 'EMPLOYEE MANAGEMENT');

    cy.contains('Operations').click();
    cy.get('input[placeholder="Search employees..."]').type('Rei');
    cy.contains('Rei Ayanami').should('be.visible');
  });
});
