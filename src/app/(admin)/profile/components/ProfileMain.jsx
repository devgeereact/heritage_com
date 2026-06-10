import avatar1 from '@/assets/images/users/avatar-1.jpg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const ProfileMain = () => {
  return <Row>
      <Col xl={9} lg={8}>
        <Card className="overflow-hidden">
          <CardBody>
            <div className="bg-primary profile-bg rounded-top position-relative mx-n3 mt-n3">
              <img src={avatar1} alt="avatar" className="avatar-xl border border-light border-3 rounded-circle position-absolute top-100 start-0 translate-middle ms-5" />
            </div>
            <div className="mt-5 d-flex flex-wrap align-items-center justify-content-between">
              <div>
                <h4 className="mb-1">
                  Gaston Lapierre <IconifyIcon icon="bxs:badge-check" className="text-success align-middle" />
                </h4>
                <p className="mb-0">Project Head Manager</p>
              </div>
              <div className="d-flex align-items-center gap-2 my-2 my-lg-0">
                <Link to="" className="btn btn-info">
                  <IconifyIcon icon="bx:message-dots" /> Message
                </Link>
                <Link to="" className="btn btn-outline-primary">
                  <IconifyIcon icon="bx:plus" /> Follow
                </Link>
                <Dropdown>
                  <DropdownToggle as={'a'} href="#" className="dropdown-toggle arrow-none card-drop" data-bs-toggle="dropdown" aria-expanded="false">
                    <IconifyIcon icon="solar:menu-dots-bold" className="fs-20 align-middle text-muted" />
                  </DropdownToggle>
                  <DropdownMenu className="dropdown-menu-end">
                    <DropdownItem>Download</DropdownItem>
                    <DropdownItem>Export</DropdownItem>
                    <DropdownItem>Import</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
            <Row className="mt-3 gy-2">
              <Col lg={2} xs={6}>
                <div className="d-flex align-items-center gap-2 border-end">
                  <div>
                    <IconifyIcon icon="solar:clock-circle-bold-duotone" className="fs-28 text-primary" />
                  </div>
                  <div>
                    <h5 className="mb-1">3+ Years Job</h5>
                    <p className="mb-0">Experience</p>
                  </div>
                </div>
              </Col>
              <Col lg={2} xs={6}>
                <div className="d-flex align-items-center gap-2 border-end">
                  <div>
                    <IconifyIcon icon="solar:cup-star-bold-duotone" className="fs-28 text-primary" />
                  </div>
                  <div>
                    <h5 className="mb-1">5 Certificate</h5>
                    <p className="mb-0">Achieved</p>
                  </div>
                </div>
              </Col>
              <Col lg={2} xs={6}>
                <div className="d-flex align-items-center gap-2">
                  <div>
                    <IconifyIcon icon="solar:notebook-bold-duotone" className="fs-28 text-primary" />
                  </div>
                  <div>
                    <h5 className="mb-1">2 Internship</h5>
                    <p className="mb-0">Completed</p>
                  </div>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
      <Col xl={3} lg={4}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'}>Personal Information</CardTitle>
          </CardHeader>
          <CardBody>
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:backpack-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">Project Head Manager</p>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:square-academic-cap-2-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Went to <span className="text-dark fw-semibold">Oxford International</span>
                </p>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:map-point-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Lives in <span className="text-dark fw-semibold">Pittsburgh, PA 15212</span>
                </p>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:users-group-rounded-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Followed by <span className="text-dark fw-semibold">16.6k People</span>
                </p>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:letter-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Email{' '}
                  <Link to="" className="text-primary fw-semibold">
                    hello@dundermuffilin.com
                  </Link>
                </p>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:link-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Website{' '}
                  <Link to="" className="text-primary fw-semibold">
                    www.larkon.co
                  </Link>
                </p>
              </div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:global-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Language <span className="text-dark fw-semibold">English , Spanish , German</span>
                </p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                  <IconifyIcon icon="solar:check-circle-bold-duotone" className="fs-20 text-secondary" />
                </div>
                <p className="mb-0 fs-14">
                  Status <span className="badge bg-success-subtle text-success ms-1">Active</span>
                </p>
              </div>
              <div className="mt-2">
                <Link to="" className="text-primary">
                  View More
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>
    </Row>;
};
export default ProfileMain;