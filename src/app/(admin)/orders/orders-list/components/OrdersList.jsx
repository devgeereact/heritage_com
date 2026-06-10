import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getAllOrders } from '@/helpers/data';
import { useFetchData } from '@/hooks/useFetchData';
import { Card, CardBody, CardFooter, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const OrdersList = () => {
  const ordersData = useFetchData(getAllOrders);
  return <Row>
      <Col xl={12}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <CardTitle as={'h4'}>All Order List</CardTitle>
            </div>
            <Dropdown>
              <DropdownToggle as={'a'} href="#" className="btn btn-sm btn-outline-light rounded content-none icons-center" data-bs-toggle="dropdown" aria-expanded="false">
                This Month <IconifyIcon className="ms-1" width={16} height={16} icon="bx:chevron-down" />
              </DropdownToggle>
              <DropdownMenu className="dropdown-menu-end">
                <DropdownItem>Download</DropdownItem>
                <DropdownItem>Export</DropdownItem>
                <DropdownItem>Import</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <CardBody className="p-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover table-centered">
                <thead className="bg-light-subtle">
                  <tr>
                    <th>Order ID</th>
                    <th>Created at</th>
                    <th>Customer</th>
                    <th>Priority</th>
                    <th>Total</th>
                    <th>Payment Status</th>
                    <th>Items</th>
                    <th>Delivery Number</th>
                    <th>Order Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData?.map((item, idx) => <tr key={idx}>
                      <td>#{item.id}/80</td>
                      <td>{item.product?.date.toLocaleString('en-us', {
                      day: 'numeric',
                      month: '2-digit',
                      year: 'numeric'
                    })}</td>
                      <td>
                        <Link to="" className="link-primary fw-medium">
                          {item.customer?.name}
                        </Link>
                      </td>
                      <td> {item.priority}</td>
                      <td> ${item.total}.00</td>
                      <td>
                        {' '}
                        <span className={`badge bg-${item.paymentStatus == 'Paid' ? 'success' : 'light'} text-${item.paymentStatus == 'Paid' ? 'light' : 'dark'}  px-2 py-1 fs-13`}>
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td>{item.orders}</td>
                      {item.deliveryNumber ? <td>{item.deliveryNumber}</td> : <td>-</td>}
                      <td>
                        {' '}
                        <span className={`badge border border-${item.orderStatus == 'Draft' ? 'secondary' : item.orderStatus == 'Canceled' ? 'danger' : item.orderStatus == 'Packaging' ? 'warning' : 'success'} text-${item.orderStatus == 'Completed' ? 'success' : item.orderStatus == 'Canceled' ? 'danger' : item.orderStatus == 'Packaging' ? 'warning' : 'secondary'}  px-2 py-1 fs-13`}>
                          {item.orderStatus}
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
          </CardBody>
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
export default OrdersList;