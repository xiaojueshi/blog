import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../config";
import { defaultLang } from "../i18n/ui";

export async function GET(context) {
  const posts = await getCollection("blog");
  // 使用默认语言的网站标题和描述
  const siteTitle = SITE_TITLE[defaultLang];
  const siteDescription = SITE_DESCRIPTION[defaultLang];

  return rss({
    title: siteTitle,
    description: siteDescription,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `/blog/${post.id}/`,
    })),
  });
}
