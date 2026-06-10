import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getAllOrders } from '@/helpers/data';
import { useFetchData } from '@/hooks/useFetchData';
import { Card, CardFooter, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const CategoryList = () => {
  const categoryData = useFetchData(getAllOrders);
  return <Row>
      <Col xl={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center gap-1">
            <CardTitle as={'h4'} className="flex-grow-1">
              All Categories List
            </CardTitle>
            <Link to="/products/product-add" className="btn btn-sm btn-primary">
              Add Product
            </Link>
            <Dropdown>
              <DropdownToggle className="btn btn-sm btn-outline-light content-none icons-center" data-bs-toggle="dropdown" aria-expanded="false">
                This Month <IconifyIcon className="ms-1" width={16} height={16} icon="bx:chevron-down" />
              </DropdownToggle>
              <DropdownMenu className="dropdown-menu-end">
                <DropdownItem>Download</DropdownItem>
                <DropdownItem>Export</DropdownItem>
                <DropdownItem>Import</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </CardHeader>
          <div>
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover table-centered">
                <thead className="bg-light-subtle">
                  <tr>
                    <th style={{
                    width: 20
                  }}>
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="customCheck1" />
                        <label className="form-check-label" htmlFor="customCheck1" />
                      </div>
                    </th>
                    <th>Categories</th>
                    <th>Starting Price</th>
                    <th>Create by</th>
                    <th>ID</th>
                    <th>Product Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData?.map((item, idx) => <tr key={idx}>
                      <td>
                        <div className="form-check">
                          <input type="checkbox" className="form-check-input" id="customCheck2" />
                          <label className="form-check-label" htmlFor="customCheck2" />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded bg-light avatar-md d-flex align-items-center justify-content-center">
                            {item.product?.image && <img src={item.product.image} alt="product" className="avatar-md" />}
                          </div>
                          <p className="text-dark fw-medium fs-15 mb-0">{item.product?.title}</p>
                        </div>
                      </td>
                      <td>
                        ${item.product?.price} to ${item.maxPrice}
                      </td>
                      <td>{item.createBy}</td>
                      <td>{item.orderId}</td>
                      <td>{item.productStock}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link to="" className="btn btn-light btn-sm">
                            <IconifyIcon icon="solar:eye-broken" className="align-middle fs-18" />
                          </Link>
                          <Link to="" className="btn btn-soft-primary btn-sm">
                            <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
                          </Link>
                          <Link to="" className="btn btn-soft-danger btn-sm">
                            <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                          </Link>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <CardFooter className="border-top">
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
          </CardFooter>
        </Card>
      </Col>
    </Row>;
};
export default CategoryList;