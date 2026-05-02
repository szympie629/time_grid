export function formatTaskCount(count: number): string {
  if (count === 1) return '1 zadanie';
  
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} zadań`;
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} zadania`;
  }
  
  return `${count} zadań`;
}
