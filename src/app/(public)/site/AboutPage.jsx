import CmsPage from './CmsPage';

/**
 * About (BUILD-SPEC 4.7): the owner's published About page (headline, intro,
 * portrait or workshop image, story). The interim copy is gone; while the page
 * is unpublished this is a noindex not-found page and the nav link is hidden.
 */
const AboutPage = () => <CmsPage pageKey="about" eyebrow="About" name="About" />;

export default AboutPage;
