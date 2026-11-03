import type { MaybeRefOrGetter } from 'vue'

/** 页面级 SEO 配置。 */
export interface PageSeoOptions {
  /** 页面标题。 */
  title: MaybeRefOrGetter<string>
  /** 页面描述。 */
  description: MaybeRefOrGetter<string>
  /** 规范化路径；默认取当前路由路径。 */
  path?: MaybeRefOrGetter<string>
  /** Open Graph 类型。 */
  type?: 'website' | 'article' | 'profile'
  /** 社交分享图路径或绝对地址。 */
  image?: string
  /** 文章发布时间。 */
  publishedAt?: MaybeRefOrGetter<string | undefined>
  /** 文章更新时间。 */
  updatedAt?: MaybeRefOrGetter<string | undefined>
  /** 文章标签。 */
  tags?: MaybeRefOrGetter<string[] | undefined>
  /** 页面结构化数据。 */
  jsonLd?: MaybeRefOrGetter<Record<string, unknown> | Record<string, unknown>[] | undefined>
}

/** 读取规范化后的站点根地址。
 * @returns 不带末尾斜杠的公开站点地址。
 * @throws 无。
 */
export function useSiteUrl() {
  const config = useRuntimeConfig()
  return computed(() => String(config.public.siteUrl || '').replace(/\/+$/, ''))
}

/** 为当前页面写入 canonical、Open Graph、Twitter 卡片与 JSON-LD。
 * @param options 页面级 SEO 配置。
 * @returns 无。
 * @throws 无。
 */
export function usePageSeo(options: PageSeoOptions) {
  const route = useRoute()
  const siteUrl = useSiteUrl()
  const canonical = computed(() => {
    const raw = toValue(options.path) ?? route.path
    const path = raw.startsWith('/') ? raw : `/${raw}`
    const normalized = path === '/' ? path : path.replace(/\/+$/, '')
    return `${siteUrl.value}${normalized}`
  })
  const title = computed(() => toValue(options.title))
  const description = computed(() => toValue(options.description))
  const image = computed(() => {
    const raw = options.image || '/og-cover.png'
    return /^https?:\/\//i.test(raw) ? raw : `${siteUrl.value}${raw.startsWith('/') ? raw : `/${raw}`}`
  })

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: options.type || 'website',
    ogUrl: canonical,
    ogSiteName: 'XIAOJUESHI',
    ogImage: image,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    articlePublishedTime: computed(() => toValue(options.publishedAt)),
    articleModifiedTime: computed(() => toValue(options.updatedAt)),
    articleTag: computed(() => toValue(options.tags)),
  })
  useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))

  if (options.jsonLd) {
    useHead(() => {
      const value = toValue(options.jsonLd)
      if (!value) return {}
      return { script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(value).replace(/</g, '\\u003c') }] }
    })
  }
}
