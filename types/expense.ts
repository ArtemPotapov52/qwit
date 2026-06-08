export type SplitType = 'equal' | 'by_items';

export interface ExpenseItemInput {
  id: string;        // client-side only, for list key
  title: string;
  amount: string;    // string for TextInput
  memberIds: string[]; // group_members.id[]
}

export interface AddExpenseByItemsPayload {
  groupId: string;
  title: string;
  paidById: string;  // group_members.id
  items: ExpenseItemInput[];
}
