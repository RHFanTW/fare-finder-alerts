import { useEffect } from "react";

type MetaTag = { name?: string; property?: string; content: string };

/**
 * Sets document.title and a handful of <meta> tags for the current page.
 * Replaces the per-route `head()` option TanStack Router used to provide —
 * there's no router-level head management in a plain SPA, so each page
 * applies its own title/meta on mount.
 */
export function useDocumentMeta(title: string, meta: MetaTag[] = []) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const addedTags: HTMLMetaElement[] = [];
    for (const tag of meta) {
      const selector = tag.name ? `meta[name="${tag.name}"]` : `meta[property="${tag.property}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      const existed = Boolean(el);
      if (!el) {
        el = document.createElement("meta");
        if (tag.name) el.setAttribute("name", tag.name);
        if (tag.property) el.setAttribute("property", tag.property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", tag.content);
      if (!existed) addedTags.push(el);
    }

    return () => {
      document.title = previousTitle;
      for (const el of addedTags) el.remove();
    };
  }, [title, meta]);
}
