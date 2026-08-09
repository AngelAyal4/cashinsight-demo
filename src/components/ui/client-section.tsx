'use client';

import { ReactNode, Suspense } from 'react';

interface ClientSectionProps {
  children: ComponentNode;
  fallback?: ComponentNode;
  className?: string;
  label?: string;
}

type ComponentNode = ReactNode;

/**
 * Sección que solo se hidrata del lado del cliente: evita parpadeos de
 * contenido estático (listado de reportes, estados vacíos) durante el SSR.
 */
export function ClientSection({ children, fallback, className, label }: ClientSectionProps) {
  return (
    <section aria-label={label} className={className ?? ''}>
      <Suspense fallback={fallback ?? null}>{children}</Suspense>
    </section>
  );
}