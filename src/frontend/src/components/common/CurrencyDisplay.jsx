import React from 'react';

/**
 * Formats a numeric currency value into the Indian Numbering System
 * E.g., 3500000 -> ₹35,00,000.00
 */
export function formatIndianRupees(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  const val = Number(amount);
  return '₹' + val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatCroreLakhShort(amount) {
  if (!amount || isNaN(amount)) return '₹0';
  const val = Number(amount);
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return '₹' + val.toLocaleString('en-IN');
}

export default function CurrencyDisplay({ amount, size = 'md', highlight = false, showFraction = true }) {
  const formatted = showFraction ? formatIndianRupees(amount) : '₹' + Number(amount || 0).toLocaleString('en-IN');
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-extrabold tracking-tight',
    hero: 'text-3xl sm:text-4xl font-black tracking-tight'
  }[size] || 'text-sm';

  return (
    <span className={`tabular-nums font-mono ${sizeClasses} ${
      highlight ? 'text-amber-400' : 'text-slate-100'
    }`}>
      {formatted}
    </span>
  );
}
