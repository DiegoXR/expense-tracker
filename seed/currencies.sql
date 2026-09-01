-- Currencies the app supports. `groups.currency_code` references this table, so
-- it must be seeded before any group can be created.
--
-- `decimals` is the authority on how money is stored and rendered: an amount is
-- always an integer in the minor unit, so USD 12.34 is 1234 while COP 12345 is
-- 12345 -- Colombian pesos are used without centavos.
--
-- Safe to re-run: INSERT OR IGNORE leaves existing rows alone.
INSERT OR IGNORE INTO currencies (code, name, symbol, decimals, locale, allow_decimals, sort_order)
VALUES
  ('USD', 'US Dollar',       '$', 2, 'en-US', 1, 1),
  ('COP', 'Colombian Peso',  '$', 0, 'es-CO', 0, 2),
  ('CAD', 'Canadian Dollar', '$', 2, 'en-CA', 1, 3);
