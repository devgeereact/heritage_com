import PageTitle from '@/components/PageTitle';
import Category from './components/Category';
import CategoryList from './components/CategoryList';
const CategoryListPage = () => {
  return <>
      <PageTitle title="Categories List" />
      <Category />
      <CategoryList />
    </>;
};
export default CategoryListPage;