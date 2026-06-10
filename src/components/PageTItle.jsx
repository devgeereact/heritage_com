import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import { useTitle } from '@/context/useTitleContext';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
const PageTitle = ({
  title
}) => {
  const {
    setTitle
  } = useTitle();
  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
  const finalTitle = title ? `${title} | ${DEFAULT_PAGE_TITLE}` : DEFAULT_PAGE_TITLE;
  return <Helmet>
      <title>{finalTitle}</title>
    </Helmet>;
};
export default PageTitle;