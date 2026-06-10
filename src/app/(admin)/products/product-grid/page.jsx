import PageTItle from '@/components/PageTItle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, CardHeader, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CategoryMenu from './components/CategoryMenu';
import Product from './components/Product';
import ProductHead from './components/ProductHead';
const ProductGridPage = () => {
  return <>
      <PageTItle title="Product Grid" />
      <Row>
        <Col lg={3}>
          <Card className="bg-light-subtle">
            <CardHeader className="border-0">
              <div className="search-bar me-3 mb-1">
                <span>
                  <IconifyIcon icon="bx-search-alt" />
                </span>
                <input type="search" className="form-control" id="search" placeholder="Search ..." />
              </div>
            </CardHeader>
          </Card>
          <CategoryMenu />
        </Col>
        <Col lg={9}>
          <ProductHead />
          <Product />
          <div className="py-3 border-top">
            <nav aria-label="Page navigation example">
              <ul className="pagination justify-content-end mb-0">
                <li className="page-item">
                  <Link className="page-link" to="">
                    Previous
                  </Link>
                </li>
                <li className="page-item active">
                  <Link className="page-link" to="">
                    1
                  </Link>
                </li>
                <li className="page-item">
                  <Link className="page-link" to="">
                    2
                  </Link>
                </li>
                <li className="page-item">
                  <Link className="page-link" to="">
                    3
                  </Link>
                </li>
                <li className="page-item">
                  <Link className="page-link" to="">
                    Next
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </Col>
      </Row>
    </>;
};
export default ProductGridPage;