import { Link, useParams } from 'react-router-dom';
import SiteLayout from './SiteLayout';
import { useBlog, useBlogPost } from './content';
import { clip } from './siteData';
import { Section, SectionHead } from './ui/Section';
import Icon from './ui/Icon';
import { Rich, LoadingPage, NotFoundPage } from './cmsBlocks';
import { JournalCard } from './BlogPage';

/**
 * One journal post: title, category and date, excerpt and the body (sanitised
 * on the server and again by Rich). Unknown, unpublished or journal off: a
 * real not-found page with noindex.
 */
const BlogPostPage = () => {
  const { slug } = useParams();
  const { post, ready } = useBlogPost(slug);
  const more = useBlog(6).filter((p) => p.slug !== slug).slice(0, 3);

  if (!ready) return <LoadingPage title="Journal" />;
  if (!post) return <NotFoundPage title="Post not found" text="This post is not available." />;

  return (
    <SiteLayout title={post.title} seo={{ description: clip(post.excerpt || post.body), type: 'article' }}>
      <Section>
        <p className="hc-crumb"><Link to="/journal">Journal</Link> / <span>{post.cat || 'Post'}</span></p>
        <SectionHead as="h1" title={post.title} lead={post.excerpt || undefined}>
          {(post.cat || post.date) && (
            <p className="hc-field-help">
              {post.cat}{post.cat && post.date ? ' · ' : ''}{post.date && <time dateTime={post.iso}>{post.date}</time>}
              {post.author ? ` · ${post.author}` : ''}
            </p>
          )}
        </SectionHead>
        <Rich html={post.body} />
        <p className="hc-mt-4"><Link to="/journal" className="hc-card-link"><Icon name="arrow-left" /> All posts</Link></p>
      </Section>

      {more.length > 0 && (
        <Section tone="alt" labelledBy="more-posts">
          <SectionHead id="more-posts" eyebrow="Journal" title="Keep reading" />
          <div className="hc-grid hc-grid--3">
            {more.map((p) => <JournalCard key={p.slug} p={p} />)}
          </div>
        </Section>
      )}
    </SiteLayout>
  );
};

export default BlogPostPage;
