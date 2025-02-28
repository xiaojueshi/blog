import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  // 加载 src/content/blog/ 目录下的所有 Markdown 和 MDX 文件
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // 使用 schema 进行 frontmatter 类型检查
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // 将字符串转换为 Date 对象
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    // 保留语言属性，但实际语言判断将基于文件路径
    language: z.enum(["en", "zh"]).optional(),
  }),
});

export const collections = { blog };
