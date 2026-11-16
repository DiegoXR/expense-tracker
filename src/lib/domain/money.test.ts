import { describe, expect, it } from 'vitest';
import {
	PERCENT_TOTAL,
	allocateByPercent,
	formatMinor,
	formatMinorPlain,
	parseMinor
} from './money';
import type { CurrencyMeta } from './types';

const USD: CurrencyMeta = {
	code: 'USD',
	symbol: '$',
	decimals: 2,
	locale: 'en-US',
	allowDecimals: true
};
const COP: CurrencyMeta = {
	code: 'COP',
	symbol: '$',
	decimals: 0,
	locale: 'es-CO',
	allowDecimals: false
};

describe('allocateByPercent', () => {
	it('splits the worked example exactly: 100.00 at 60/40', () => {
		expect(allocateByPercent(10_000, [60, 40])).toEqual([6000, 4000]);
	});

	it('hands the leftover unit to the largest remainder', () => {
		// 3.33 split 50/50 is 1.665 each; someone has to take the extra cent.
		expect(allocateByPercent(333, [50, 50])).toEqual([167, 166]);
		// 101 pesos split 50/50 must still total 101, not 102.
		expect(allocateByPercent(101, [50, 50])).toEqual([51, 50]);
	});

	it('never loses a unit, even when the total is smaller than the member count', () => {
		expect(allocateByPercent(1, [34, 33, 33])).toEqual([1, 0, 0]);
		expect(allocateByPercent(2, [34, 33, 33])).toEqual([1, 1, 0]);
	});

	it('sums to the total for every random split (the property that matters)', () => {
		for (let run = 0; run < 500; run++) {
			const memberCount = 2 + Math.floor(Math.random() * 6);
			const totalMinor = Math.floor(Math.random() * 1_000_000);

			// Random whole-percent shares that still sum to exactly 100.
			const cuts = Array.from({ length: memberCount - 1 }, () =>
				Math.floor(Math.random() * PERCENT_TOTAL)
			).sort((a, b) => a - b);
			const shares = [...cuts, PERCENT_TOTAL].map((cut, i) => cut - (i === 0 ? 0 : cuts[i - 1]));

			const allocated = allocateByPercent(totalMinor, shares);
			expect(allocated.reduce((sum, minor) => sum + minor, 0)).toBe(totalMinor);
			expect(allocated.every((minor) => minor >= 0)).toBe(true);
		}
	});

	it('rejects shares that do not add up to 100', () => {
		expect(() => allocateByPercent(10_000, [60, 30])).toThrow(/sum to 100/);
		expect(() => allocateByPercent(10_000, [])).toThrow(/must not be empty/);
	});

	it('rejects fractional percentages', () => {
		expect(() => allocateByPercent(10_000, [60.5, 39.5])).toThrow(/whole number/);
	});

	it('rejects a negative or non-integer total', () => {
		expect(() => allocateByPercent(-1, [100])).toThrow(/non-negative/);
		expect(() => allocateByPercent(10.5, [100])).toThrow(/non-negative/);
	});
});

describe('parseMinor', () => {
	it('parses plain and grouped amounts', () => {
		expect(parseMinor('12.34', USD)).toBe(1234);
		expect(parseMinor('1234', USD)).toBe(123_400);
		expect(parseMinor('1,234.50', USD)).toBe(123_450);
		expect(parseMinor('$1,234.50', USD)).toBe(123_450);
	});

	it('resolves both separators unambiguously, whichever order they come in', () => {
		expect(parseMinor('1,234.50', USD)).toBe(123_450);
		expect(parseMinor('1.234,50', USD)).toBe(123_450);
	});

	it('pads a short fraction rather than misreading it', () => {
		expect(parseMinor('1.5', USD)).toBe(150);
	});

	it('reads a lone non-decimal separator as grouping', () => {
		expect(parseMinor('1,234', USD)).toBe(123_400);
		// '.' is the decimal separator in en-US, so this one is over-precise.
		expect(() => parseMinor('1.234', USD)).toThrow(/at most 2 decimal places/);
	});

	it('follows the currency locale when the separator is ambiguous', () => {
		// es-CO groups with '.', so this is twelve thousand three hundred forty-five.
		expect(parseMinor('12.345', COP)).toBe(12_345);
		// en-US divides with '.', so the same string is over-precise for USD.
		expect(() => parseMinor('12.345', USD)).toThrow(/at most 2 decimal places/);
	});

	it('refuses decimals on a currency that does not allow them', () => {
		expect(parseMinor('12345', COP)).toBe(12_345);
		expect(parseMinor('1.250.000', COP)).toBe(1_250_000);
		expect(() => parseMinor('12,5', COP)).toThrow(/must be whole numbers/);
	});

	it('rejects empty and non-numeric input', () => {
		expect(() => parseMinor('', USD)).toThrow(/Enter an amount/);
		expect(() => parseMinor('abc', USD)).toThrow(/Enter an amount/);
	});
});

describe('formatMinor', () => {
	it('renders each currency at its own precision', () => {
		expect(formatMinor(12_345, USD)).toBe('$123.45');
		expect(formatMinor(12_345, COP)).toMatch(/12\.345/);
	});

	it('shows an explicit sign for balances, but not for zero', () => {
		expect(formatMinor(5000, USD, { signed: true })).toBe('+$50.00');
		expect(formatMinor(-5000, USD, { signed: true })).toMatch(/^-\$50\.00$|^−\$50\.00$/);
		expect(formatMinor(0, USD, { signed: true })).toBe('$0.00');
	});
});

describe('formatMinorPlain', () => {
	it('round-trips through parseMinor', () => {
		for (const minor of [0, 5, 99, 100, 123_456]) {
			expect(parseMinor(formatMinorPlain(minor, USD.decimals), USD)).toBe(minor);
			expect(parseMinor(formatMinorPlain(minor, COP.decimals), COP)).toBe(minor);
		}
	});

	it('pads amounts below one major unit', () => {
		expect(formatMinorPlain(5, 2)).toBe('0.05');
		expect(formatMinorPlain(50, 2)).toBe('0.50');
	});
});
