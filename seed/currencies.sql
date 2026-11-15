-- Currencies the app supports. `groups.currency_code` references this table, so
-- it must be seeded before any group can be created.
--
-- `decimals` is the authority on how money is stored and rendered: an amount is
-- always an integer in the minor unit, so USD 12.34 is 1234 while COP 12345 is
-- 12345 -- Colombian pesos are used without centavos. KRW, VND and IDR are
-- likewise used without a minor unit in practice.
--
-- Safe to re-run: INSERT OR IGNORE leaves existing rows alone.
INSERT OR IGNORE INTO currencies (code, name, symbol, decimals, locale, allow_decimals, sort_order)
VALUES
  ('USD', 'US Dollar',       '$', 2, 'en-US', 1, 1),
  ('COP', 'Colombian Peso',  '$', 0, 'es-CO', 0, 2),
  ('CAD', 'Canadian Dollar', '$', 2, 'en-CA', 1, 3),
  ('KRW', 'South Korean Won',    '₩',   0, 'ko-KR', 0, 4),
  ('VND', 'Vietnamese Dong',     '₫',   0, 'vi-VN', 0, 5),
  ('MYR', 'Malaysian Ringgit',   'RM',  2, 'ms-MY', 1, 6),
  ('IDR', 'Indonesian Rupiah',   'Rp',  0, 'id-ID', 0, 7),
  ('CNY', 'Chinese Yuan',        '¥',   2, 'zh-CN', 1, 8),
  ('PHP', 'Philippine Peso',     '₱',   2, 'en-PH', 1, 9),
  ('SGD', 'Singapore Dollar',    'S$',  2, 'en-SG', 1, 10),
  ('HKD', 'Hong Kong Dollar',    'HK$', 2, 'zh-HK', 1, 11);
