// types/incomeStatement.ts
// Types pour le compte de résultat

export interface IncomeCategory {
  name: string;
  amount: number;
  percentage: number;
}

export interface ExpenseSubcategory {
  name: string;
  amount: number;
  percentage: number;
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  subcategories?: ExpenseSubcategory[];
}

export interface IncomeStatementPeriod {
  start_date: string;
  end_date: string;
}

export interface IncomeStatementTotals {
  total_income: number;
  total_expense: number;
  net_result: number;
  profit_margin: number;
}

export interface IncomeStatementIncome {
  categories: IncomeCategory[];
  total: number;
}

export interface IncomeStatementExpenses {
  categories: ExpenseCategory[];
  total: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  invoice_number: string;
  type: 'Recette' | 'Dépense';
  client_supplier: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  has_invoice: boolean;
  status: string;
}

export interface IncomeStatementResult {
  period: IncomeStatementPeriod;
  income: IncomeStatementIncome;
  expenses: IncomeStatementExpenses;
  totals: IncomeStatementTotals;
  journal: JournalEntry[];
}

