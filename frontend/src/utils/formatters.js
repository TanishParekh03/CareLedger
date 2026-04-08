function pad(num) {
  return String(num).padStart(2, '0');
}

export function toDateInputValue(value) {
  if (!value) return '';

  const raw = String(value).trim();
  const pureDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDate) return `${pureDate[1]}-${pureDate[2]}-${pureDate[3]}`;

  // If backend returns ISO datetime with timezone, derive the local calendar date.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function formatDate(value) {
  if (!value) return '-';

  const normalizedDate = toDateInputValue(value);
  const isoLike = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = isoLike
    ? new Date(Number(isoLike[1]), Number(isoLike[2]) - 1, Number(isoLike[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function titleCase(value) {
  if (!value) return '';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
