/**
 * Resolving the percentages a user typed into the amounts we store. Called by the
 * editor to preview and by the form action to persist, so the two cannot disagree.
 */

import { allocateByPercent } from './money';

export type SplitInput = {
	/** Group membership id, not person id. */
	memberId: string;
	sharePct: number;
};

export type SplitResult = SplitInput & {
	/** Resolved share in minor units. Sums across the expense to the total. */
	shareMinor: number;
};

/**
 * Resolves percentage shares into minor-unit amounts summing exactly to `totalMinor`.
 * Sorts by member id first, so reordering rows never moves the odd unit to someone else.
 */
export function buildSplits(totalMinor: number, inputs: SplitInput[]): SplitResult[] {
	const ordered = [...inputs].sort((a, b) => (a.memberId < b.memberId ? -1 : 1));
	const amounts = allocateByPercent(
		totalMinor,
		ordered.map((split) => split.sharePct)
	);
	return ordered.map((split, i) => ({ ...split, shareMinor: amounts[i] }));
}
