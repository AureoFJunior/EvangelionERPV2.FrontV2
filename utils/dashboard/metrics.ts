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
  rows: Array<{ createdAt?: string }>,
) =>
  buckets.map((bucket) => {
    const count = rows.filter((row) => {
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
      const created = parseDate(order.date ?? '');
      if (!created) {
        return false;
      }
      return created.getFullYear() === bucket.year && created.getMonth() === bucket.month;
    }).length;
    return { x: bucket.label, y: count };
  });

export const buildCategoryData = (products: ProductModel[]) => {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    const category = product.category || 'Uncategorized';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  const total = products.length;
  if (total === 0) {
    return [{ x: 'No data', y: 100 }];
  }

  return Array.from(counts.entries()).map(([category, count]) => ({
    x: category,
    y: Math.max(1, Math.round((count / total) * 100)),
  }));
};

export const buildActivities = (orders: OrderModel[], products: ProductModel[]) => {
  const events: { action: string; time: string; date: Date }[] = [];

  orders.forEach((order) => {
    const created = parseDate(order.date ?? '');
    if (!created) {
      return;
    }
    events.push({
      action: `Order #${order.id ?? '-'} received`,
      time: formatRelativeTime(created),
      date: created,
    });
  });

  products.forEach((product) => {
    const created = parseDate(product.updatedAt ?? product.createdAt ?? '');
    if (!created) {
      return;
    }
    events.push({
      action: `Product updated: ${product.name}`,
      time: formatRelativeTime(created),
      date: created,
    });
  });

  return events
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    .map(({ action, time }) => ({ action, time }));
};

const isActiveCustomer = (customer: CustomerModel) => {
  if (customer.isActive === false) {
    return false;
  }
  const status = (customer.status ?? '').toLowerCase();
  return status !== 'inactive' && status !== 'disabled' && status !== 'blocked';
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

const sumOrderRange = (orders: OrderModel[], start: Date, end: Date) =>
  orders.reduce((sum, order) => {
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
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const activeCustomers = customers.filter(isActiveCustomer).length;
  const revenue = orders.reduce(
    (sum, order) => sum + (typeof order.total === 'number' ? order.total : 0),
    0,
  );

  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(now.getDate() - 30);
  const prev30Start = new Date(now);
  prev30Start.setDate(now.getDate() - 60);
  const prev30End = new Date(now);
  prev30End.setDate(now.getDate() - 30);

  const productLast30 = countDateRange(products, last30Start, now);
  const productPrev30 = countDateRange(products, prev30Start, prev30End);
  const ordersLast30 = countOrderRange(orders, last30Start, now);
  const ordersPrev30 = countOrderRange(orders, prev30Start, prev30End);
  const customersLast30 = countDateRange(customers, last30Start, now);
  const customersPrev30 = countDateRange(customers, prev30Start, prev30End);
  const revenueLast30 = sumOrderRange(orders, last30Start, now);
  const revenuePrev30 = sumOrderRange(orders, prev30Start, prev30End);

  return {
    totalProducts,
    totalOrders,
    activeCustomers,
    revenue,
    productChange: buildChange(productLast30, productPrev30),
    orderChange: buildChange(ordersLast30, ordersPrev30),
    customerChange: buildChange(customersLast30, customersPrev30),
    revenueChange: buildChange(revenueLast30, revenuePrev30),
  };
};
