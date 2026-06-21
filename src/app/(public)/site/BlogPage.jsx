import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import { useBlog } from './content';

const BlogPage = () => {
  const posts = useBlog(48);

  return (
    <SiteLayout title="Journal">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>Journal</span></div>
          <h1 className="hc-h1">The Journal.</h1>
          <p>Stories from the cutting table — heritage, craft and what goes on behind the seams.</p>
        </div>
      </section>

      <section className="hc-section">
        <div className="hc-container">
          {posts.length === 0 ? (
            <div className="hc-card hc-text-center" style={{ padding: '4rem 2rem', maxWidth: '34rem', margin: '0 auto' }}>
              <span className="hc-card-ico" style={{ margin: '0 auto 1rem' }}><IconifyIcon icon="solar:notebook-bold" /></span>
              <h3>Nothing here yet</h3>
              <p className="hc-card-desc" style={{ margin: '0.5rem auto 0', maxWidth: '24rem' }}>
                Our first stories are being written. Check back soon — or join the family to hear first.
              </p>
              <Link to="/contact" className="hc-btn hc-btn--primary hc-mt-4">Join the family</Link>
            </div>
          ) : (
            <div className="hc-grid hc-grid--3">
              {posts.map((p) => (
                <article key={p.slug} className="hc-journal-card">
                  <Link to={`/journal/${p.slug}`} className={`hc-journal-media ${p.tile}`}>
                    {p.cat && <span className="hc-journal-cat">{p.cat}</span>}
                  </Link>
                  <div className="hc-journal-body">
                    {p.date && <span className="hc-journal-date">{p.date}</span>}
                    <h4><Link to={`/journal/${p.slug}`}>{p.title}</Link></h4>
                    <p>{p.excerpt}</p>
                    <Link to={`/journal/${p.slug}`} className="hc-card-link">
                      Read more <IconifyIcon icon="solar:arrow-right-linear" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default BlogPage;
