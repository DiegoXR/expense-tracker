/**
 * Money and percentage arithmetic, shared by the browser preview and the server.
 * Money is an integer minor unit; percentages are whole integers summing to 100.
 */

import type { CurrencyMeta } from './types';

/** Percentage shares always add up to this. */
export const PERCENT_TOTAL = 100;

/**
 * Splits `totalMinor` across whole-percent shares summing to 100.
 * Largest-remainder: each share floors, then leftover units go to the biggest remainders.
 */
export function allocateByPercent(totalMinor: number, sharesPct: number[]): number[] {
	if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) {
		throw new Error(`totalMinor must be a non-negative safe integer, got ${totalMinor}`);
	}
	if (sharesPct.length === 0) throw new Error('sharesPct must not be empty');

	for (const pct of sharesPct) {
		if (!Number.isInteger(pct) || pct < 0 || pct > PERCENT_TOTAL) {
			throw new Error(`each share must be a whole number in [0, 100], got ${pct}`);
		}
	}

	const sum = sharesPct.reduce((acc, pct) => acc + pct, 0);
	if (sum !== PERCENT_TOTAL) throw new Error(`shares must sum to 100, got ${sum}`);

	const floors = sharesPct.map((pct) => Math.floor((totalMinor * pct) / PERCENT_TOTAL));
	const remainders = sharesPct.map((pct, i) => totalMinor * pct - floors[i] * PERCENT_TOTAL);
	const leftover = totalMinor - floors.reduce((acc, minor) => acc + minor, 0);

	const byRemainderDesc = remainders
		.map((remainder, index) => ({ remainder, index }))
		.sort((a, b) => b.remainder - a.remainder || a.index - b.index);

	const result = [...floors];
	for (let i = 0; i < leftover; i++) result[byRemainderDesc[i].index] += 1;
	return result;
}

const decimalSeparatorCache = new Map<string, '.' | ','>();

/** The character this locale puts before the fractional part: `.` or `,`. */
function localeDecimalSeparator(locale: string): '.' | ',' {
	const cached = decimalSeparatorCache.get(locale);
	if (cached) return cached;

	const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
	const separator = parts.find((part) => part.type === 'decimal')?.value === ',' ? ',' : '.';
	decimalSeparatorCache.set(locale, separator);
	return separator;
}

/**
 * Parses user input into minor units, honouring the currency's locale and precision.
 * Rejects excess precision instead of rounding it away behind the user's back.
 */
export function parseMinor(input: string, currency: CurrencyMeta): number {
	const cleaned = input.trim().replace(/[^\d.,-]/g, '');
	if (cleaned === '') throw new Error('Enter an amount.');

	const negative = cleaned.startsWith('-');
	const digitsAndSeparators = cleaned.replace(/-/g, '');
	if (!/^[\d.,]+$/.test(digitsAndSeparators)) throw new Error(`"${input}" is not a valid amount.`);

	const lastDot = digitsAndSeparators.lastIndexOf('.');
	const lastComma = digitsAndSeparators.lastIndexOf(',');

	// Both separators present is unambiguous: the rightmost divides. A lone
	// separator only divides if it is this locale's decimal mark.
	let decimalSeparator: '.' | ',' | null = null;
	if (lastDot !== -1 && lastComma !== -1) {
		decimalSeparator = lastDot > lastComma ? '.' : ',';
	} else if (lastDot !== -1 || lastComma !== -1) {
		const separator = lastDot !== -1 ? '.' : ',';
		const occurrences = digitsAndSeparators.split(separator).length - 1;
		const groups = occurrences > 1 || separator !== localeDecimalSeparator(currency.locale);
		decimalSeparator = groups ? null : separator;
	}

	let whole: string;
	let fraction: string;
	if (decimalSeparator === null) {
		whole = digitsAndSeparators.replace(/[.,]/g, '');
		fraction = '';
	} else {
		const at = digitsAndSeparators.lastIndexOf(decimalSeparator);
		whole = digitsAndSeparators.slice(0, at).replace(/[.,]/g, '');
		fraction = digitsAndSeparators.slice(at + 1).replace(/[.,]/g, '');
	}

	if (fraction.length > 0 && !currency.allowDecimals) {
		throw new Error(`${currency.code} amounts must be whole numbers.`);
	}
	if (fraction.length > currency.decimals) {
		throw new Error(
			`Use at most ${currency.decimals} decimal place${currency.decimals === 1 ? '' : 's'}.`
		);
	}

	const scaled = `${whole || '0'}${fraction.padEnd(currency.decimals, '0')}`;
	const minor = Number(scaled);
	if (!Number.isSafeInteger(minor)) throw new Error(`"${input}" is too large.`);

	return negative ? -minor : minor;
}

/**
 * Renders minor units as a currency string: `1234` USD becomes `"$12.34"`.
 * With `signed`, positive amounts get a `+` and zero gets no sign — what balances want.
 */
export function formatMinor(
	minor: number,
	currency: CurrencyMeta,
	{ signed = false }: { signed?: boolean } = {}
): string {
	return new Intl.NumberFormat(currency.locale, {
		style: 'currency',
		currency: currency.code,
		minimumFractionDigits: currency.decimals,
		maximumFractionDigits: currency.decimals,
		signDisplay: signed ? 'exceptZero' : 'auto'
	}).format(minor / 10 ** currency.decimals);
}

/** Renders minor units without a currency symbol, for input fields. */
export function formatMinorPlain(minor: number, decimals: number): string {
	if (decimals === 0) return String(minor);

	const negative = minor < 0;
	const digits = String(Math.abs(minor)).padStart(decimals + 1, '0');
	return `${negative ? '-' : ''}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}
