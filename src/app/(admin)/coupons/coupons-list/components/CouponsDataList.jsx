import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getProductData } from '@/helpers/data';
import { useFetchData } from '@/hooks/useFetchData';
import { Card, CardFooter, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const CouponsDataList = () => {
  const couponsData = useFetchData(getProductData);
  return <Row>
      <Col xl={12}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <CardTitle as={'h4'}>All Product List</CardTitle>
            </div>
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
          </div>
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
                    <th>Product Name &amp; Type</th>
                    <th>Price</th>
                    <th>Discount</th>
                    <th>Code</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsData?.map((item, idx) => <tr key={idx}>
                      <td>
                        <div className="form-check">
                          <input type="checkbox" className="form-check-input" id="customCheck2" />
                          <label className="form-check-label" htmlFor="customCheck2">
                            &nbsp;
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded bg-light avatar-md d-flex align-items-center justify-content-center">
                            <img src={item.image} alt="product-image" className="avatar-md" />
                          </div>
                          <div>
                            <Link to="" className="text-dark fw-medium fs-15">
                              {item.title}
                            </Link>
                            <p className="text-muted mb-0 mt-1 fs-13">
                              <span>{item.category}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>${item.price}.00</td>
                      <td>${item.discount}.00</td>
                      <td>{item.code}</td>
                      <td>{item.date.toLocaleString('en-us', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}</td>
                      <td>{item.endDate.toLocaleString('en-us', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}</td>
                      <td>
                        <span className={`badge text-${item.productStatus == 'Expired' ? 'danger' : 'success'} bg-${item.productStatus == 'Expired' ? 'danger' : 'success'}-subtle fs-12`}>
                          {item.productStatus == 'Expired' ? <IconifyIcon icon="bx:x" /> : <IconifyIcon icon="bx:check-double" />}
                          {item.productStatus}
                        </span>
                      </td>
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
export default CouponsDataList;