
SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_account_id');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_orders_account_id ON orders(account_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_status');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_orders_status ON orders(status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_created_at');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_orders_created_at ON orders(created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_order_code');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_orders_order_code ON orders(order_code)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_account_created');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_orders_account_created ON orders(account_id, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'idx_orders_account_status');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_orders_account_status ON orders(account_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @exist = (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'order_items' AND index_name = 'idx_order_items_order_id');
SET @sql = IF(@exist = 0, 'CREATE INDEX idx_order_items_order_id ON order_items(order_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;