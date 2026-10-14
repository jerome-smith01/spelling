/** "Due Oct 20", "Due today", "Overdue (Oct 12)" or "No due date" for a 'YYYY-MM-DD' date. */
export function dueText(due, now = new Date()) {
  if (!due) return { text: 'No due date', late: false };
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { text: 'No due date', late: false };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (d.getTime() === today.getTime()) return { text: 'Due today', late: false };
  return d < today ? { text: `Overdue (${label})`, late: true } : { text: `Due ${label}`, late: false };
}
