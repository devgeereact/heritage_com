import { Link, useParams } from 'react-router-dom';
import IconifyIcon from './ui/Icon';
import SiteLayout from './SiteLayout';
import { useBlog, useBlogPost } from './content';

const BlogPostPage = () => {
  const { slug } = useParams();
  const { post, ready } = useBlogPost(slug);
  const more = useBlog(6).filter((p) => p.slug !== slug).slice(0, 3);

  if (!post) {
    if (!ready) {
      return (
        <SiteLayout title="Loading…">
          <section className="hc-section hc-text-center"><div className="hc-container">Loading…</div></section>
        </SiteLayout>
      );
    }
    return (
      <SiteLayout title="Story not found">
        <section className="hc-section hc-text-center">
          <div className="hc-container">
            <div className="hc-kicker" style={{ justifyContent: 'center' }}>404</div>
            <h1 className="hc-h2 hc-mt-2">This page is unwritten.</h1>
            <p className="hc-lead" style={{ margin: '1rem auto 0' }}>Let&apos;s get you back to the Journal.</p>
            <Link to="/journal" className="hc-btn hc-btn--primary hc-mt-4">Back to the Journal</Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout title={post.title}>
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <Link to="/journal">Journal</Link> / <span>{post.cat || 'Story'}</span></div>
          <h1 className="hc-h1">{post.title}</h1>
          <p>{[post.cat, post.date].filter(Boolean).join(' · ')}</p>
        </div>
      </section>

      <section className="hc-section">
        <div className="hc-container" style={{ maxWidth: 760 }}>
          <div className={`hc-tile ${post.tile || 'hc-tile-mixed'}`} style={{ aspectRatio: '16 / 9', marginBottom: '2.5rem' }} />
          {post.excerpt && <p className="hc-lead" style={{ marginBottom: '1.5rem' }}>{post.excerpt}</p>}
          <div className="hc-prose" dangerouslySetInnerHTML={{ __html: post.body || '' }} />
          <div className="hc-mt-4">
            <Link to="/journal" className="hc-card-link"><IconifyIcon icon="solar:arrow-left-linear" /> All stories</Link>
          </div>
        </div>
      </section>

      {more.length > 0 && (
        <section className="hc-section hc-section--paper">
          <div className="hc-container">
            <div className="hc-head">
              <div className="hc-kicker">More from the Journal</div>
              <h2 className="hc-h2">Keep reading.</h2>
            </div>
            <div className="hc-grid hc-grid--3">
              {more.map((p) => (
                <article key={p.slug} className="hc-journal-card">
                  <Link to={`/journal/${p.slug}`} className={`hc-journal-media ${p.tile}`}>
                    {p.cat && <span className="hc-journal-cat">{p.cat}</span>}
                  </Link>
                  <div className="hc-journal-body">
                    {p.date && <span className="hc-journal-date">{p.date}</span>}
                    <h4><Link to={`/journal/${p.slug}`}>{p.title}</Link></h4>
                    <p>{p.excerpt}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteLayout>
  );
};

export default BlogPostPage;
