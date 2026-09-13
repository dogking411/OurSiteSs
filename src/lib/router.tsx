import { useEffect, useState } from 'react';

/**
 * Мини-роутер на хэше.
 *
 * Хэш выбран сознательно: статический хостинг (GitHub Pages) не умеет отдавать
 * index.html на произвольный путь, и при перезагрузке /wishes пользователь
 * получил бы 404. С хэшем ссылки работают одинаково и на Pages, и на своём
 * сервере, без единой строчки серверной конфигурации.
 */
export function useRoute(): string {
  const [route, setRoute] = useState(() => currentRoute());

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function currentRoute(): string {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return raw.split('?')[0] || 'home';
}

export function navigate(route: string): void {
  window.location.hash = `/${route}`;
}

export function Link({
  to,
  className,
  children,
  ...rest
}: { to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={`#/${to}`} className={className} {...rest}>
      {children}
    </a>
  );
}
