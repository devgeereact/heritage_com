import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { reviewData } from '../data';
import { Fragment } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const Review = () => {
  return <Col lg={6}>
      <Card>
        <CardHeader>
          <CardTitle as={'h4'}>Top Review From World</CardTitle>
        </CardHeader>
        <CardBody>
          {reviewData.map((item, idx) => <Fragment key={idx}>
              <div className="d-flex align-items-center gap-2">
                <img src={item.image} alt="avatar" className="avatar-md rounded-circle" />
                <div>
                  <h5 className="mb-0">{item.name}</h5>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-3 mb-1">
                <ul className="d-flex text-warning m-0 fs-20 list-unstyled">
                  <li>
                    <IconifyIcon icon="bxs:star" />
                  </li>
                  <li>
                    <IconifyIcon icon="bxs:star" />
                  </li>
                  <li>
                    <IconifyIcon icon="bxs:star" />
                  </li>
                  <li>
                    <IconifyIcon icon="bxs:star" />
                  </li>
                  <li>
                    <IconifyIcon icon="bxs:star-half" />
                  </li>
                </ul>
                <p className="fw-medium mb-0 text-dark fs-15">Excellent Quality</p>
              </div>
              <p className="mb-0 text-dark fw-medium fs-15">
                Reviewed in {item.country} on {item.date.toLocaleString('en-us', {
              day: 'numeric',
              month: '2-digit',
              year: 'numeric'
            })}
              </p>
              <p className="text-muted">{item.description}</p>
              <div className="mt-2">
                <Link to="" className="fs-14 me-3 text-muted">
                  <IconifyIcon icon="bx-like" /> Helpful
                </Link>
                <Link to="" className="fs-14 text-muted">
                  Report
                </Link>
              </div>
              {reviewData.length - 1 != idx && <hr className="my-3" />}
            </Fragment>)}
        </CardBody>
      </Card>
    </Col>;
};
export default Review;