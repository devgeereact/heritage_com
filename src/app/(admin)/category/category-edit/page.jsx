import FileUpload from '@/components/FileUpload';
import PageTitle from '@/components/PageTitle';
import { Col, Row } from 'react-bootstrap';
import AddCategory from './components/AddCategory';
import CategoryEditCard from './components/CategoryEditCard';
const CategoryEditPage = () => {
  return <>
      <PageTitle title="Category Edit" />
      <Row>
        <CategoryEditCard />
        <Col xl={9} lg={8}>
          <FileUpload title="Add Thumbnail Photo" />
          <AddCategory />
        </Col>
      </Row>
    </>;
};
export default CategoryEditPage;