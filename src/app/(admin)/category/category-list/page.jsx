import PageTItle from '@/components/PageTItle';
import Category from './components/Category';
import CategoryList from './components/CategoryList';
const CategoryListPage = () => {
  return <>
      <PageTItle title="Categories List" />
      <Category />
      <CategoryList />
    </>;
};
export default CategoryListPage;