/*
  Generates /blog/index.html and /blog/<slug>.html from data/blog-posts.js.

  Run with: node scripts/generate-blog.js

  This is the only place header/footer/breadcrumb/schema markup for blog
  pages lives — edit here (or in data/site-config.js for business info,
  or data/blog-posts.js for article content) and re-run, rather than
  hand-editing files inside /blog/.
*/

const fs = require('fs');
const path = require('path');

const config = require('../data/site-config.js');
const posts = require('../data/blog-posts.js');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readTimeMinutes(bodyHtml) {
  const text = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.length ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function findPost(slug) {
  const p = posts.find(x => x.slug === slug);
  if (!p) throw new Error(`Unknown related slug: ${slug}`);
  return p;
}

// ---------------------------------------------------------------------
// Shared markup fragments
// ---------------------------------------------------------------------

function renderHeader() {
  return `
  <header class="site-header">
    <div class="container header-inner">
      <div class="logo">Power Washing<span> Indianapolis</span></div>
      <div class="header-right">
        <div class="header-phone">Call us: <a href="${config.phoneHref}">${config.phoneDisplay}</a></div>
        <a href="/#quote" class="btn btn-primary">Free Quote</a>
        <div class="menu-wrap">
          <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menuDropdown">&#9776; <span class="menu-label">Menu</span></button>
          <div class="menu-dropdown" id="menuDropdown" role="menu">
            <a href="/">Home</a>
            <a href="/#services">Services</a>
            <a href="/#areas">Service Areas</a>
            <a href="/blog/">Blog</a>
            <a href="/#quote">Get a Quote</a>
          </div>
        </div>
      </div>
    </div>
  </header>`;
}

function renderBreadcrumb(items) {
  // items: [{label, href}] — last item has no href (current page)
  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast) return `<span class="current">${escapeHtml(item.label)}</span>`;
    return `<a href="${item.href}">${escapeHtml(item.label)}</a>\n      <span class="sep">›</span>`;
  }).join('\n      ');
  return `
  <div class="breadcrumb">
    <div class="container breadcrumb-inner">
      ${parts}
    </div>
  </div>`;
}

function renderFooter() {
  const areaLinks = config.cities.map(c => `            <li><a href="/${c.slug}">${escapeHtml(c.name)}</a></li>`).join('\n');
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">

        <div>
          <div class="footer-brand">Power Washing<span> Indianapolis</span></div>
          <div class="footer-nap">
            <strong style="color:#ddd;">${escapeHtml(config.primaryCity)}, Indiana</strong><br>
            Phone: <a href="${config.phoneHref}">${config.phoneDisplay}</a><br>
            Email: <a href="mailto:${config.email}">${config.email}</a><br>
            Serving Marion County &amp; surrounding areas
          </div>
        </div>

        <div class="footer-col">
          <h4>Services</h4>
          <ul class="footer-links">
            <li><a href="/#services">House &amp; Siding Washing</a></li>
            <li><a href="/#services">Driveway &amp; Concrete Cleaning</a></li>
            <li><a href="/#services">Deck &amp; Fence Washing</a></li>
            <li><a href="/#services">Roof Soft Washing</a></li>
            <li><a href="/#services">Gutter Cleaning</a></li>
            <li><a href="/#services">Commercial Power Washing</a></li>
            <li><a href="/blog/">Blog</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Service Areas</h4>
          <ul class="footer-links">
            <li><a href="/">Indianapolis</a></li>
${areaLinks}
          </ul>
        </div>

      </div>
      <div class="footer-bottom" style="color:#ddd;">
        &copy; 2026 ${escapeHtml(config.businessName)}. All rights reserved.
      </div>
    </div>
  </footer>`;
}

function renderMenuScript() {
  return `
  <script>
    (function(){
      var btn = document.getElementById('menuBtn');
      var drop = document.getElementById('menuDropdown');
      if(!btn) return;
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var open = drop.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', function(){
        drop.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    })();
  </script>`;
}

function renderCTA() {
  return `
<div class="article-cta">
  <p>Ready to book, or just want a straight answer on pricing for your property?</p>
  <div class="cta-btn-row">
    <a href="${config.phoneHref}" class="btn btn-primary">Call ${config.phoneDisplay}</a>
    <a href="/#quote" class="btn btn-outline" style="color:#374151; border-color:#374151;">Request a Free Quote</a>
  </div>
</div>`;
}

function renderHead({ title, description, canonicalPath, ogType, schemas }) {
  const canonical = `${config.domain}${canonicalPath}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />

  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="${ogType}" />
  <meta name="geo.region" content="US-IN" />
  <meta name="geo.placename" content="${config.primaryCity}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/style.css" />

${schemas.map(s => `  <script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n  </script>`).join('\n')}
</head>`;
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `${config.domain}${item.href || ''}`,
    })),
  };
}

// ---------------------------------------------------------------------
// Article page
// ---------------------------------------------------------------------

function renderArticlePage(post) {
  const url = `/blog/${post.slug}`;
  const readTime = readTimeMinutes(post.body);
  const bodyHtml = post.body.trim().replace('{{CTA}}', renderCTA());

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    author: { '@type': 'Organization', name: config.authorName },
    publisher: {
      '@type': 'Organization',
      name: config.businessName,
      url: `${config.domain}/`,
    },
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${config.domain}${url}` },
    url: `${config.domain}${url}`,
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog/' },
    { label: post.title },
  ];

  const related = post.related.map(findPost);

  const head = renderHead({
    title: `${post.title} | ${config.brandShort}`,
    description: post.metaDescription,
    canonicalPath: url,
    ogType: 'article',
    schemas: [blogPostingSchema, breadcrumbSchema(breadcrumbItems.map(i => ({ label: i.label, href: i.href || url })))],
  });

  return `${head}
<body>
${renderHeader()}
${renderBreadcrumb(breadcrumbItems)}

  <section class="article-hero">
    <div class="container">
      <div class="article-meta">
        <span class="category-badge">${escapeHtml(post.category)}</span>
        <span class="blog-card-date">${formatDate(post.publishDate)}</span>
        <span class="read-time">${readTime} min read</span>
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="article-dek">${escapeHtml(post.dek)}</p>
    </div>
  </section>

  <div class="article-wrap">
    <div class="article-body">
${bodyHtml}
    </div>
  </div>

  <section class="related-posts">
    <div class="container">
      <h2>Related Reading</h2>
      <div class="related-grid">
${related.map(r => `        <a class="related-card" href="/blog/${r.slug}">${escapeHtml(r.title)}</a>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="cta-banner">
    <div class="container">
      <h2>Ready to Restore Your Property's Curb Appeal?</h2>
      <p>Call now for a free, no-obligation pressure washing quote in Indianapolis. Fast scheduling, eco-friendly cleaning, zero hassle.</p>
      <div class="cta-actions">
        <a href="${config.phoneHref}" class="btn btn-white" style="font-size:1.08rem; padding:17px 32px;">Call ${config.phoneDisplay}</a>
        <a href="/#quote" class="btn btn-outline">Request Online Quote</a>
      </div>
    </div>
  </section>
${renderFooter()}
${renderMenuScript()}
</body>
</html>
`;
}

// ---------------------------------------------------------------------
// Blog index page
// ---------------------------------------------------------------------

function renderIndexPage() {
  const url = '/blog/';
  const sorted = [...posts].sort((a, b) => b.publishDate.localeCompare(a.publishDate));

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Blog' },
  ];

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Power Washing Tips & Guides | Power Washing Indianapolis',
    description: 'Pricing guides, seasonal maintenance tips, local regulations, and how-to articles for Indianapolis homeowners, landlords, and property managers.',
    url: `${config.domain}${url}`,
  };

  const head = renderHead({
    title: `Power Washing Blog | Tips & Guides for Indianapolis Homeowners | ${config.brandShort}`,
    description: 'Pricing guides, seasonal maintenance tips, local regulations, and how-to articles for Indianapolis homeowners, landlords, and property managers.',
    canonicalPath: url,
    ogType: 'website',
    schemas: [collectionSchema, breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'Blog', href: url }])],
  });

  const cards = sorted.map(post => {
    const readTime = readTimeMinutes(post.body);
    return `        <a class="blog-card" href="/blog/${post.slug}">
          <div class="blog-card-meta">
            <span class="category-badge">${escapeHtml(post.category)}</span>
            <span class="blog-card-date">${formatDate(post.publishDate)}</span>
          </div>
          <h2>${escapeHtml(post.title)}</h2>
          <p>${escapeHtml(post.dek)}</p>
          <div class="blog-card-meta" style="margin-bottom:0;">
            <span class="blog-card-link">Read Article &rarr;</span>
            <span class="read-time">${readTime} min read</span>
          </div>
        </a>`;
  }).join('\n');

  return `${head}
<body>
${renderHeader()}
${renderBreadcrumb(breadcrumbItems)}

  <section class="blog-hero">
    <div class="container">
      <h1>Power Washing Tips &amp; Guides for Indianapolis Homeowners</h1>
      <p>Pricing breakdowns, seasonal maintenance advice, local regulations, and honest how-to guides — from the team that services Indianapolis and every suburb we cover.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="blog-grid">
${cards}
      </div>
    </div>
  </section>

  <section class="cta-banner">
    <div class="container">
      <h2>Ready to Restore Your Property's Curb Appeal?</h2>
      <p>Call now for a free, no-obligation pressure washing quote in Indianapolis. Fast scheduling, eco-friendly cleaning, zero hassle.</p>
      <div class="cta-actions">
        <a href="${config.phoneHref}" class="btn btn-white" style="font-size:1.08rem; padding:17px 32px;">Call ${config.phoneDisplay}</a>
        <a href="/#quote" class="btn btn-outline">Request Online Quote</a>
      </div>
    </div>
  </section>
${renderFooter()}
${renderMenuScript()}
</body>
</html>
`;
}

// ---------------------------------------------------------------------
// sitemap.xml (covers the whole site, not just /blog)
// ---------------------------------------------------------------------

function renderSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  urls.push({ loc: `${config.domain}/`, priority: '1.0' });
  for (const city of config.cities) {
    urls.push({ loc: `${config.domain}/${city.slug}`, priority: '0.8' });
  }
  urls.push({ loc: `${config.domain}/blog/`, priority: '0.7' });
  for (const post of posts) {
    urls.push({ loc: `${config.domain}/blog/${post.slug}`, priority: '0.6', lastmod: post.publishDate });
  }

  const body = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

// ---------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------

function main() {
  // Validate slugs are unique and related slugs resolve
  const slugs = new Set();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`Duplicate slug: ${post.slug}`);
    slugs.add(post.slug);
  }
  for (const post of posts) {
    for (const rel of post.related) {
      if (!slugs.has(rel)) throw new Error(`Post "${post.slug}" references unknown related slug "${rel}"`);
    }
    if (post.body.split('{{CTA}}').length !== 2) {
      throw new Error(`Post "${post.slug}" must contain exactly one {{CTA}} marker`);
    }
  }

  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

  for (const post of posts) {
    const html = renderArticlePage(post);
    fs.writeFileSync(path.join(BLOG_DIR, `${post.slug}.html`), html, 'utf8');
  }

  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), renderIndexPage(), 'utf8');

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), renderSitemap(), 'utf8');

  console.log(`Generated ${posts.length} article pages + blog/index.html + sitemap.xml`);
}

main();

module.exports = { readTimeMinutes, posts, config };
