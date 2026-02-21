export interface BudgetItem {
  text: string;
  priority: number;
  source: string;
}

export interface FittedBudgetItem {
  text: string;
  source: string;
}

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function fitWithinBudget(items: BudgetItem[], budget: number): FittedBudgetItem[] {
  if (!Number.isFinite(budget) || budget <= 0) {
    return [];
  }

  const sorted = items
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.index - b.index;
    });

  let remaining = Math.floor(budget);
  const fitted: FittedBudgetItem[] = [];

  for (const item of sorted) {
    if (!item.text.trim()) {
      continue;
    }

    const cost = estimateTokens(item.text);
    if (cost <= remaining) {
      fitted.push({ text: item.text, source: item.source });
      remaining -= cost;
    }

    if (remaining <= 0) {
      break;
    }
  }

  return fitted;
}
