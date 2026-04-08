import DatePicker from 'react-datepicker';

function toDate(value) {
  if (!value) return null;

  const raw = String(value).trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const localDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);

  const dateOnlyMatch = raw.match(dateOnly);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  if (hasTimezone) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dateTimeMatch = raw.match(localDateTime);
  if (dateTimeMatch) {
    const [, y, m, d, hh, mm] = dateTimeMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDateOnly(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeLocal(date) {
  return `${formatDateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LuxeDateField({ value, onChange, placeholder = 'Select date', ...rest }) {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(date) => onChange(date ? formatDateOnly(date) : '')}
      placeholderText={placeholder}
      className="luxe-date-input"
      calendarClassName="luxe-calendar"
      popperClassName="luxe-calendar-popper"
      dateFormat="dd MMM yyyy"
      isClearable
      showPopperArrow={false}
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={120}
      showMonthDropdown
      dropdownMode="select"
      {...rest}
    />
  );
}

export function LuxeDateTimeField({ value, onChange, placeholder = 'Select date & time', ...rest }) {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(date) => onChange(date ? formatDateTimeLocal(date) : '')}
      placeholderText={placeholder}
      className="luxe-date-input"
      calendarClassName="luxe-calendar"
      popperClassName="luxe-calendar-popper"
      dateFormat="dd MMM yyyy, h:mm aa"
      showTimeSelect
      timeIntervals={15}
      isClearable
      showPopperArrow={false}
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={120}
      showMonthDropdown
      dropdownMode="select"
      {...rest}
    />
  );
}
