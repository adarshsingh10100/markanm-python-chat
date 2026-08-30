import React, { useEffect, useState } from 'react';
import { request } from '../services/api';

export function SEOHead() {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    let isMounted = true;
    request('/public/branding')
      .then(data => {
        if (isMounted && data.success && data.branding) {
          setBranding(data.branding);
          applyBranding(data.branding);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, []);

  const applyBranding = (b) => {
    if (!b) return;

    // 1. Document Title
    if (b.site_title) {
      document.title = b.site_title;
    }

    // Helper to set or create meta tag
    const setMeta = (attrName, attrValue, content) => {
      if (!content) return;
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to set or create link tag
    const setLink = (rel, href, type = null, sizes = null) => {
      if (!href) return;
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
      if (type) element.setAttribute('type', type);
      if (sizes) element.setAttribute('sizes', sizes);
    };

    // 2. Meta Description & Keywords
    setMeta('name', 'description', b.site_description);
    setMeta('name', 'keywords', b.site_keywords);
    setMeta('name', 'robots', b.robots_indexing || 'index, follow');

    // 3. Favicon & Apple Touch Icon
    if (b.site_favicon_url) {
      setLink('icon', b.site_favicon_url);
      setLink('shortcut icon', b.site_favicon_url);
    }
    if (b.apple_touch_icon_url) {
      setLink('apple-touch-icon', b.apple_touch_icon_url, null, '180x180');
    }

    // 4. OpenGraph Meta Tags (WhatsApp, Facebook, Discord)
    setMeta('property', 'og:site_name', b.site_title);
    setMeta('property', 'og:title', b.site_title);
    setMeta('property', 'og:description', b.site_description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', window.location.origin);
    if (b.og_image_url) {
      const fullOgImg = b.og_image_url.startsWith('http') ? b.og_image_url : window.location.origin + b.og_image_url;
      setMeta('property', 'og:image', fullOgImg);
      setMeta('property', 'og:image:secure_url', fullOgImg);
    }

    // 5. Twitter Cards (Twitter / X)
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', b.site_title);
    setMeta('name', 'twitter:description', b.site_description);
    if (b.og_image_url) {
      const fullOgImg = b.og_image_url.startsWith('http') ? b.og_image_url : window.location.origin + b.og_image_url;
      setMeta('name', 'twitter:image', fullOgImg);
    }
  };

  return null;
}
