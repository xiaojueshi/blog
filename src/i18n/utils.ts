import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}

export function getRouteFromUrl(url: URL): string {
  const pathname = url.pathname;
  const parts = pathname.split('/');
  
  if (parts.length > 2) {
    // 移除语言前缀
    const withoutLang = parts.slice(2).join('/');
    return '/' + withoutLang;
  }
  
  return '/';
}

// 获取当前路由的其他语言版本的URL
export function getLocalizedPathname(
  { pathname, search }: { pathname: string; search: string },
  lang: keyof typeof ui
) {
  const parts = pathname.split('/');
  
  // 检查当前URL是否已经有语言前缀
  const currentLang = parts[1] as keyof typeof ui;
  const hasLangPrefix = currentLang in ui;
  
  if (hasLangPrefix) {
    // 替换语言前缀
    parts[1] = lang;
  } else {
    // 添加语言前缀
    parts.splice(1, 0, lang);
  }
  
  return parts.join('/') + search;
}