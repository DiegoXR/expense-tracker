-- Default expense categories. Global rather than per-group, so spending reports
-- can cross groups. Safe to re-run: names are unique and INSERT OR IGNORE skips
-- rows that already exist.
INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order)
VALUES
  ('cat-groceries', 'Groceries',   'shopping-cart', 'emerald', 1),
  ('cat-rent',      'Rent',        'house',         'indigo',  2),
  ('cat-utilities', 'Utilities',   'plug',          'violet',  3),
  ('cat-dining',    'Dining out',  'utensils',      'amber',   4),
  ('cat-transport', 'Transport',   'car',           'sky',     5),
  ('cat-other',     'Other',       'circle-dashed', 'slate',   6);
