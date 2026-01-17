import * as products from './productCache';
import * as inventory from './inventoryCache';
import * as sales from './salesCache';
import * as debts from './debtsCache';
import * as customers from './customerCache';
import * as stores from './stores';
import * as queue from './queue';
import notificationCache from './notificationsCache';

import * as syncLogs from './syncLogs';
import * as utils from '../utils';

const offlineCache = {
  ...products,
  ...inventory,
  ...sales,
  ...debts,
  ...customers,
  ...stores,
  ...queue,
  ...notificationCache,
  ...syncLogs,
  ...utils,

  // Global helper to count all pending items in the queue
  async getGlobalPendingCount(storeId) {
    const sid = Number(storeId);
    if (isNaN(sid)) return 0;
    const { default: db } = await import('./dexieDb');
    return db.offline_queue
      .where({ store_id: sid, status: 'pending' })
      .count();
  }
};

export default offlineCache;
