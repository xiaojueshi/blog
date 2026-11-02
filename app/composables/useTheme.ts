import type { ThemePreference, SiteSettings } from '#shared/workspace'
/** 管理主题偏好，cookie 保证 SSR 与客户端首屏一致。
 * @returns 选择、实际主题及修改方法。
 * @throws 无。
 */
export function useTheme() {
  const preference = useCookie<ThemePreference | null>('xjs-theme', { path: '/', sameSite: 'lax', maxAge: 31536000 })
  const { data: site } = useNuxtData<{ settings: SiteSettings }>('site-workspace')
  const systemDark = useState('system-dark', () => false)
  const selection = computed<ThemePreference>(() => {
    const value = preference.value || site.value?.settings.theme || 'system'
    return ['light','dark','system'].includes(value) ? value : 'system'
  })
  const isDark = computed(() => selection.value === 'dark' || (selection.value === 'system' && systemDark.value))
  let media: MediaQueryList | undefined
  const sync = () => { systemDark.value = Boolean(media?.matches) }
  onMounted(() => { media = window.matchMedia('(prefers-color-scheme: dark)'); sync(); media.addEventListener('change', sync) })
  onBeforeUnmount(() => media?.removeEventListener('change', sync))
  return { selection, isDark, setTheme: (value: ThemePreference) => { preference.value = value }, resetTheme: () => { preference.value = null } }
}
