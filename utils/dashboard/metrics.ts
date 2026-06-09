import {
  Customer as CustomerModel,
  Order as OrderModel,
  Product as ProductModel,
} from '../../services/erpService';

export const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const parseDate = (value?: string) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) {
    return 'just now';
  }
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const buildChange = (current: number, previous: number) => {
  if (previous <= 0) {
    const text = current > 0 ? '+100%' : '0%';
    return { text, isPositive: current >= 0 };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    text: `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`,
    isPositive: percent >= 0,
  };
};

export const buildMonthlyBuckets = (months = 6) => {
  const now = new Date();
  return Array.from({ length: months }).map((_, index) => {
    const offset = months - 1 - index;
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return {
      label: monthLabels[date.getMonth()],
      year: date.getFullYear(),
      month: date.getMonth(),
    };
  });
};

export const buildCreatedAtSeries = (
  buckets: Array<{ label: string; year: number; month: number }>,
  rows: Array<{ createdAt?: string; isActive?: boolean }>,
) =>
  buckets.map((bucket) => {
    const count = rows.filter((row) => {
      if (row.isActive === false) {
        return false;
      }
      const created = parseDate(row.createdAt ?? '');
      if (!created) {
        return false;
      }
      return created.getFullYear() === bucket.year && created.getMonth() === bucket.month;
    }).length;
    return { x: bucket.label, y: count };
  });

export const buildOrderDateSeries = (
  buckets: Array<{ label: string; year: number; month: number }>,
  orders: OrderModel[],
) =>
  buckets.map((bucket) => {
    const count = orders.filter((order) => {
      if (isInactiveOrder(order)) {
        return false;
      }
      const created = parseDate(order.date ?? '');
      if (!created) {
        return false;
      }
      return created.getFullYear() === bucket.year && created.getMonth() === bucket.month;
    }).length;
    return { x: bucket.label, y: count };
  });

export const buildCategoryData = (products: ProductModel[]) => {
  const activeProducts = products.filter((product) => product.isActive !== false);
  const counts = new Map<string, number>();
  activeProducts.forEach((product) => {
    const category = product.category || 'Uncategorized';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  const total = activeProducts.length;
  if (total === 0) {
    return [{ x: 'No data', y: 100 }];
  }

  return Array.from(counts.entries()).map(([category, count]) => ({
    x: category,
    y: Math.max(1, Math.round((count / total) * 100)),
  }));
};

export const buildActivities = (orders: OrderModel[], products: ProductModel[]) => {
  const events: { action: string; time: string; date: Date; amount: number | null }[] = [];

  orders.forEach((order) => {
    if (isInactiveOrder(order)) {
      return;
    }
    const created = parseDate(order.date ?? '');
    if (!created) {
      return;
    }
    events.push({
      action: `Order #${order.id ?? '-'} received`,
      time: formatRelativeTime(created),
      date: created,
      amount: typeof order.total === 'number' ? order.total : null,
    });
  });

  products.forEach((product) => {
    if (product.isActive === false) {
      return;
    }
    const created = parseDate(product.updatedAt ?? product.createdAt ?? '');
    if (!created) {
      return;
    }
    events.push({
      action: `Product updated: ${product.name}`,
      time: formatRelativeTime(created),
      date: created,
      amount: null,
    });
  });

  return events
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    .map(({ action, time, amount }) => ({ action, time, amount }));
};

const isInactiveOrder = (order: OrderModel) => {
  if (order.isActive === false) {
    return true;
  }
  const status = (order.status ?? '').toLowerCase();
  return status === 'inactive' || status === 'cancelled' || status === 'canceled' || status === 'deleted';
};

const isActiveCustomer = (customer: CustomerModel) => {
  return customer.isActive === true;
};

const isInRange = (date: Date, start: Date, end: Date) => date >= start && date < end;

const countDateRange = (
  rows: Array<{ createdAt?: string }>,
  start: Date,
  end: Date,
) =>
  rows.filter((row) => {
    const created = parseDate(row.createdAt ?? '');
    return created ? isInRange(created, start, end) : false;
  }).length;

const countOrderRange = (orders: OrderModel[], start: Date, end: Date) =>
  orders.filter((order) => {
    const created = parseDate(order.date ?? '');
    return created ? isInRange(created, start, end) : false;
  }).length;

const hasPaidDate = (order: OrderModel) =>
  (order.payday != null && order.payday !== '') ||
  (order.paymentDate != null && order.paymentDate !== '');

const sumOrderRange = (orders: OrderModel[], start: Date, end: Date) =>
  orders.reduce((sum, order) => {
    if (!hasPaidDate(order)) return sum;
    const created = parseDate(order.date ?? '');
    if (!created || !isInRange(created, start, end)) {
      return sum;
    }
    return sum + (typeof order.total === 'number' ? order.total : 0);
  }, 0);

export const buildDashboardTotals = (
  products: ProductModel[],
  orders: OrderModel[],
  customers: CustomerModel[],
) => {
  const activeProducts = products.filter((product) => product.isActive !== false);
  const activeOrders = orders.filter((order) => !isInactiveOrder(order));
  const activeCustomersRows = customers.filter(isActiveCustomer);

  const totalProducts = activeProducts.length;
  const totalOrders = activeOrders.length;
  const activeCustomers = activeCustomersRows.length;
  const revenue = activeOrders
    .filter(hasPaidDate)
    .reduce(
      (sum, order) => sum + (typeof order.total === 'number' ? order.total : 0),
      0,
    );

  const outstandingAR = activeOrders
    .filter((order) => {
      const s = (order.status ?? '').toLowerCase();
      return s !== 'completed' && s !== 'paid' && s !== 'delivered';
    })
    .reduce((sum, order) => sum + (typeof order.total === 'number' ? order.total : 0), 0);

  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(now.getDate() - 30);
  const prev30Start = new Date(now);
  prev30Start.setDate(now.getDate() - 60);
  const prev30End = new Date(now);
  prev30End.setDate(now.getDate() - 30);

  const productLast30 = countDateRange(activeProducts, last30Start, now);
  const productPrev30 = countDateRange(activeProducts, prev30Start, prev30End);
  const ordersLast30 = countOrderRange(activeOrders, last30Start, now);
  const ordersPrev30 = countOrderRange(activeOrders, prev30Start, prev30End);
  const customersLast30 = countDateRange(activeCustomersRows, last30Start, now);
  const customersPrev30 = countDateRange(activeCustomersRows, prev30Start, prev30End);
  const revenueLast30 = sumOrderRange(activeOrders, last30Start, now);
  const revenuePrev30 = sumOrderRange(activeOrders, prev30Start, prev30End);

  const arLast30 = activeOrders
    .filter((order) => {
      const s = (order.status ?? '').toLowerCase();
      if (s === 'completed' || s === 'paid' || s === 'delivered') return false;
      const d = parseDate(order.date ?? '');
      return d ? isInRange(d, last30Start, now) : false;
    })
    .reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : 0), 0);
  const arPrev30 = activeOrders
    .filter((order) => {
      const s = (order.status ?? '').toLowerCase();
      if (s === 'completed' || s === 'paid' || s === 'delivered') return false;
      const d = parseDate(order.date ?? '');
      return d ? isInRange(d, prev30Start, prev30End) : false;
    })
    .reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : 0), 0);

  return {
    totalProducts,
    totalOrders,
    activeCustomers,
    revenue,
    outstandingAR,
    productChange: buildChange(productLast30, productPrev30),
    orderChange: buildChange(ordersLast30, ordersPrev30),
    customerChange: buildChange(customersLast30, customersPrev30),
    revenueChange: buildChange(revenueLast30, revenuePrev30),
    arChange: buildChange(arLast30, arPrev30),
  };
};

export const buildMonthlyRevenueSeries = (orders: OrderModel[]) => {
  const now = new Date();
  const year = now.getFullYear();
  const activeOrders = orders.filter((order) => !isInactiveOrder(order));

  const paidOrders = activeOrders.filter(hasPaidDate);

  return monthLabels.map((label, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 1);
    const revenue = paidOrders.reduce((sum, order) => {
      const d = parseDate(order.date ?? '');
      if (!d || !isInRange(d, start, end)) return sum;
      return sum + (typeof order.total === 'number' ? order.total : 0);
    }, 0);
    return { x: label, y: revenue };
  });
};

export const buildMonthlyTargetSeries = (revenueSeries: Array<{ x: string; y: number }>) => {
  const filledMonths = revenueSeries.filter((d) => d.y > 0);
  const avg = filledMonths.length > 0
    ? filledMonths.reduce((s, d) => s + d.y, 0) / filledMonths.length
    : 0;
  const offsets = [0.92, 0.95, 0.97, 1.0, 1.02, 1.04, 1.06, 1.08, 1.10, 1.12, 1.14, 1.16];
  return revenueSeries.map((d, i) => ({ x: d.x, y: avg > 0 ? avg * offsets[i % offsets.length] : 0 }));
};

export interface OrderStatusCounts {
  completed: number;
  processing: number;
  pending: number;
  cancelled: number;
  total: number;
}

export const buildOrderStatusCounts = (orders: OrderModel[]): OrderStatusCounts => {
  const counts: OrderStatusCounts = { completed: 0, processing: 0, pending: 0, cancelled: 0, total: 0 };
  orders.forEach((order) => {
    if (order.isActive === false) return;
    const s = (order.status ?? '').toLowerCase();
    if (s === 'completed' || s === 'paid' || s === 'delivered') counts.completed += 1;
    else if (s === 'processing' || s === 'in progress' || s === 'inprogress') counts.processing += 1;
    else if (s === 'cancelled' || s === 'canceled') counts.cancelled += 1;
    else counts.pending += 1;
    counts.total += 1;
  });
  return counts;
};

export interface CategoryRevenueRow {
  category: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export const buildCategoryRevenue = (
  products: ProductModel[],
  orders: OrderModel[],
): CategoryRevenueRow[] => {
  const activeProducts = products.filter((p) => p.isActive !== false);
  const activeOrders = orders.filter((o) => !isInactiveOrder(o));

  const categories = new Set<string>();
  activeProducts.forEach((p) => {
    if (p.category) categories.add(p.category);
  });
  if (categories.size === 0) {
    categories.add('Uncategorized');
  }

  const productCategoryMap = new Map<string | number, string>();
  activeProducts.forEach((p) => {
    productCategoryMap.set(p.id, p.category || 'Uncategorized');
  });

  const now = new Date();
  const year = now.getFullYear();

  const quarterRanges = [
    { start: new Date(year, 0, 1), end: new Date(year, 3, 1) },
    { start: new Date(year, 3, 1), end: new Date(year, 6, 1) },
    { start: new Date(year, 6, 1), end: new Date(year, 9, 1) },
    { start: new Date(year, 9, 1), end: new Date(year + 1, 0, 1) },
  ];

  const catRevenue = new Map<string, [number, number, number, number]>();
  categories.forEach((cat) => catRevenue.set(cat, [0, 0, 0, 0]));

  activeOrders.forEach((order) => {
    const d = parseDate(order.date ?? '');
    if (!d) return;
    const total = typeof order.total === 'number' ? order.total : 0;

    let qIdx = -1;
    for (let i = 0; i < quarterRanges.length; i++) {
      if (d >= quarterRanges[i].start && d < quarterRanges[i].end) {
        qIdx = i;
        break;
      }
    }
    if (qIdx < 0) return;

    // Distribute order revenue across categories based on product count
    const catCount = new Map<string, number>();
    if (order.orderedProduct && Array.isArray(order.orderedProduct)) {
      (order.orderedProduct as Array<{ productId?: string | number }>).forEach((item) => {
        const cat = item.productId ? (productCategoryMap.get(item.productId) ?? 'Uncategorized') : 'Uncategorized';
        catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
      });
    }

    if (catCount.size === 0) {
      // Distribute evenly across all categories
      const share = total / categories.size;
      categories.forEach((cat) => {
        const arr = catRevenue.get(cat)!;
        arr[qIdx] += share;
      });
    } else {
      const totalItems = Array.from(catCount.values()).reduce((a, b) => a + b, 0);
      catCount.forEach((count, cat) => {
        if (!catRevenue.has(cat)) catRevenue.set(cat, [0, 0, 0, 0]);
        const arr = catRevenue.get(cat)!;
        arr[qIdx] += (total * count) / totalItems;
      });
    }
  });

  return Array.from(catRevenue.entries())
    .map(([category, quarters]) => ({
      category,
      q1: Math.round(quarters[0] / 1000),
      q2: Math.round(quarters[1] / 1000),
      q3: Math.round(quarters[2] / 1000),
      q4: Math.round(quarters[3] / 1000),
    }))
    .sort((a, b) => (b.q1 + b.q2 + b.q3 + b.q4) - (a.q1 + a.q2 + a.q3 + a.q4))
    .slice(0, 5);
};
