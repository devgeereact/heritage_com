import ChoicesFormInput from '@/components/form/ChoicesFormInput';
import PageTItle from '@/components/PageTItle';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const RoleAddPage = () => {
  return <>
      <PageTItle title="Role Add" />
      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader>
              <CardTitle as={'h4'}>Roles Information</CardTitle>
            </CardHeader>
            <CardBody>
              <Row>
                <Col lg={6}>
                  <form>
                    <div className="mb-3">
                      <label htmlFor="roles-name" className="form-label">
                        Roles Name
                      </label>
                      <input type="text" id="roles-name" className="form-control" placeholder="Role name" />
                    </div>
                  </form>
                </Col>
                <Col lg={6}>
                  <form>
                    <div className="mb-3">
                      <label htmlFor="workspace" className="form-label">
                        Add Workspace
                      </label>
                      <ChoicesFormInput className="form-control" id="workspace" data-choices data-choices-groups data-placeholder="Select Workspace" defaultValue={'Select Workspace'}>
                        <option value={'Facebook'}>Facebook</option>
                        <option value="Slack">Slack</option>
                        <option value="Zoom">Zoom</option>
                        <option value="Analytics">Analytics</option>
                        <option value="Meet">Meet</option>
                        <option value="Mail">Mail</option>
                        <option value="Strip">Strip</option>
                      </ChoicesFormInput>
                    </div>
                  </form>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="role-tag" className="form-label">
                      Tag
                    </label>
                    <ChoicesFormInput options={{
                    removeItemButton: true
                  }} className="form-control" id="choices-multiple-remove-button" data-choices data-choices-removeitem multiple>
                      <option value="Manager">Manager</option>
                      <option value="Product">Product</option>
                      <option value="Data">Data</option>
                      <option value="Designer">Designer</option>
                      <option value="Supporter">Supporter</option>
                      <option value="System Design">System Design</option>
                      <option value="QA">QA</option>
                    </ChoicesFormInput>
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="user-name" className="form-label">
                      User Name
                    </label>
                    <input type="text" id="user-name" className="form-control" placeholder="Enter name" />
                  </div>
                </Col>
                <Col lg={6}>
                  <p>User Status </p>
                  <div className="d-flex gap-2 align-items-center">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" defaultChecked />
                      <label className="form-check-label" htmlFor="flexRadioDefault1">
                        Active
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" />
                      <label className="form-check-label" htmlFor="flexRadioDefault2">
                        In Active
                      </label>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
            <CardFooter className="border-top">
              <Link to="" className="btn btn-primary">
                Create Roles
              </Link>
            </CardFooter>
          </Card>
        </Col>
      </Row>
    </>;
};
export default RoleAddPage;