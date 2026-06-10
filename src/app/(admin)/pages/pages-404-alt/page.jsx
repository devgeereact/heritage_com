import error404Img from '@/assets/images/404-error.png';
import PageTItle from '@/components/PageTItle';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const Pages404AltPage = () => {
  return <>
      <PageTItle title="Page 404 (ALT)" />
      <Row className="align-items-center justify-content-center">
        <Col xl={5}>
          <Card>
            <CardBody className="px-3 py-4">
              <Row className="align-items-center justify-content-center h-100">
                <Col lg={10}>
                  <div className="mx-auto text-center">
                    <img src={error404Img} alt="error-404" className="img-fluid my-3" />
                  </div>
                  <h3 className="fw-bold text-center lh-base">Ooops! The Page You&apos;re Looking For Was Not Found</h3>
                  <p className="text-muted text-center mt-1 mb-4">
                    Sorry, we couldn&apos;t find the page you were looking for. We suggest that you return to main sections
                  </p>
                  <div className="text-center">
                    <Link to="/dashboard" className="btn btn-primary">
                      Back To Home
                    </Link>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Pages404AltPage;