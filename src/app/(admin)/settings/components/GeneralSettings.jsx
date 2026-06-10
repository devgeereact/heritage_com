import ChoicesFormInput from '@/components/form/ChoicesFormInput';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const GeneralSettings = () => {
  return <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:settings-bold-duotone" className="text-primary fs-20" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <form>
                  <div className="mb-3">
                    <label htmlFor="meta-name" className="form-label">
                      Meta Title
                    </label>
                    <input type="text" id="meta-name" className="form-control" placeholder="Title" />
                  </div>
                </form>
              </Col>
              <Col lg={6}>
                <form>
                  <div className="mb-3">
                    <label htmlFor="meta-tag" className="form-label">
                      Meta Tag Keyword
                    </label>
                    <input type="text" id="meta-tag" className="form-control" placeholder="Enter word" />
                  </div>
                </form>
              </Col>
              <Col lg={6}>
                <form>
                  <div className="mb-3">
                    <label htmlFor="themes" className="form-label">
                      Store Themes
                    </label>
                    <ChoicesFormInput className="form-control" id="themes" data-choices data-choices-groups data-placeholder="Select Themes">
                      <option>Default</option>
                      <option value="Dark">Dark</option>
                      <option value="Minimalist">Minimalist</option>
                      <option value="High Contrast">High Contrast</option>
                    </ChoicesFormInput>
                  </div>
                </form>
              </Col>
              <Col lg={6}>
                <form>
                  <div className="mb-3">
                    <label htmlFor="layout" className="form-label">
                      Layout
                    </label>
                    <ChoicesFormInput className="form-control" id="layout" data-choices data-choices-groups data-placeholder="Select Layout">
                      <option>Default</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Dining">Dining</option>
                      <option value="Interior">Interior</option>
                      <option value="Home">Home</option>
                    </ChoicesFormInput>
                  </div>
                </form>
              </Col>
              <Col lg={12}>
                <div>
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea className="form-control bg-light-subtle" id="description" rows={4} placeholder="Type description" defaultValue={''} />
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>;
};
export default GeneralSettings;