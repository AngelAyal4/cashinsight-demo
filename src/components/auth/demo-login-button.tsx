'use client';

interface DemoLoginButtonProps {
  isDemo: boolean;
}

export function DemoLoginButton({ isDemo }: DemoLoginButtonProps) {
  if (!isDemo) return null;

  return (
    <div className="mt-4 border-t-2 border-ink/10 pt-4">
      <button
        type="button"
        onClick={async () => {
          const res = await fetch('/api/auth/demo-login', { method: 'POST' });
          if (res.ok) {
            window.location.href = '/';
          }
        }}
        className="btn-brutal btn-brutal-secondary w-full"
      >
        🎯 Entrar como demo
      </button>
      <p className="mt-2 text-center text-xs font-medium text-ink/60">
        demo@cashinsight.app — datos ficticios
      </p>
    </div>
  );
}
