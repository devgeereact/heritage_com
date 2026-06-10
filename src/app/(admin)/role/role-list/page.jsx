import PageTItle from '@/components/PageTItle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getRoleListData } from '@/helpers/data';
import { useFetchData } from '@/hooks/useFetchData';
import { Fragment } from 'react';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const RoleListPage = () => {
  const roleListData = useFetchData(getRoleListData);
  return <>
      <PageTItle title="Roles List" />
      <Card className="overflow-hiddenCoupons">
        <CardBody className="p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover table-centered">
              <thead className="bg-light-subtle">
                <tr>
                  <th>Role</th>
                  <th>Workspace</th>
                  <th>Tags</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {roleListData?.map((item, idx) => <tr key={idx}>
                    <td>{item.role}</td>
                    {item.icon ? <td>
                        {item.icon && <img src={item.icon} className="avatar-xs rounded-circle me-1" alt="..." />} {item.workspace}
                      </td> : <td>
                        <Link to="" className="link-primary">
                          + {item.workspace}
                        </Link>
                      </td>}
                    <td>
                      {' '}
                      {item.tags.map((tagItem, idx) => <Fragment key={idx}>
                          <span key={idx} className="badge bg-light-subtle text-muted border py-1 px-2">
                            {tagItem}
                          </span>
                          &nbsp;
                        </Fragment>)}{' '}
                    </td>
                    <td key={idx}>
                      <div className="avatar-group">
                        {item.users && item.users.map((user, idx) => <Fragment key={idx}>
                              {user.image && user.image.map((img, idx) => <div className="avatar" key={idx}>
                                    <img src={img} alt="avatar" className="rounded-circle avatar-sm" />
                                  </div>)}
                              {user.TextAvatar && user.TextAvatar.map((text, idx) => <div className="avatar" key={idx}>
                                    <span className={`avatar-sm d-flex align-items-center justify-content-center bg-${text.variant}-subtle text-${text.variant} rounded-circle fw-bold shadow`}>
                                      {text.text}
                                    </span>
                                  </div>)}
                            </Fragment>)}
                        {!item.users && <Link to="" className="link-primary">
                            + Add User
                          </Link>}
                      </div>
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        {item.status ? <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked1" defaultChecked /> : <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked1" />}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link to="#!" className="btn btn-light btn-sm">
                          <IconifyIcon icon="solar:eye-broken" className="align-middle fs-18" />
                        </Link>
                        <Link to="/role/role-edit" className="btn btn-soft-primary btn-sm">
                          <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
                        </Link>
                        <Link to="#!" className="btn btn-soft-danger btn-sm">
                          <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                        </Link>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </CardBody>
        <Row className="g-0 align-items-center justify-content-between text-center text-sm-start p-3 border-top">
          <div className="col-sm">
            <div className="text-muted">
              Showing <span className="fw-semibold">10</span> of <span className="fw-semibold">59</span> Results
            </div>
          </div>
          <Col sm={'auto'} className="mt-3 mt-sm-0">
            <ul className="pagination  m-0">
              <li className="page-item">
                <a href="#" className="page-link">
                  <IconifyIcon icon="bx:left-arrow-alt" />
                </a>
              </li>
              <li className="page-item active">
                <a href="#" className="page-link">
                  1
                </a>
              </li>
              <li className="page-item">
                <a href="#" className="page-link">
                  2
                </a>
              </li>
              <li className="page-item">
                <a href="#" className="page-link">
                  3
                </a>
              </li>
              <li className="page-item">
                <a href="#" className="page-link">
                  <IconifyIcon icon="bx:right-arrow-alt" />
                </a>
              </li>
            </ul>
          </Col>
        </Row>
      </Card>
    </>;
};
export default RoleListPage;