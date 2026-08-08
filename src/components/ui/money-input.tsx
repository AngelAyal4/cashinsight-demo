'use client';

import { useState, type ChangeEvent } from 'react';

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  min?: number;
  max?: number;
}

export function MoneyInput({
  value,
  onChange,
  required,
  placeholder,
  className,
  id,
  min = 0,
  max,
}: MoneyInputProps) {
  const [text, setText] = useState(() => (value ? String(value) : ''));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(',', '.');
    const filtered = raw.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
    setText(filtered);
    const num = parseFloat(filtered);
    if (Number.isNaN(num)) {
      onChange(0);
      return;
    }
    let clamped = Math.max(min, num);
    if (max !== undefined) {
      clamped = Math.min(max, clamped);
    }
    onChange(clamped);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      required={required}
      value={text}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
}
