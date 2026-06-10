import FileUpload from '@/components/FileUpload';
import ChoicesFormInput from '@/components/form/ChoicesFormInput';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const AddProduct = () => {
  return <Col xl={9} lg={8}>
      <FileUpload title="Add Product Photo" />
      <Card>
        <CardHeader>
          <CardTitle as={'h4'}>Product Information</CardTitle>
        </CardHeader>
        <CardBody>
          <Row>
            <Col lg={6}>
              <form>
                <div className="mb-3">
                  <label htmlFor="product-name" className="form-label">
                    Product Name
                  </label>
                  <input type="text" id="product-name" className="form-control" placeholder="Items Name" defaultValue="Men Black Slim Fit T-shirt" />
                </div>
              </form>
            </Col>
            <Col lg={6}>
              <form>
                <label htmlFor="product-categories" className="form-label">
                  Product Categories
                </label>
                <ChoicesFormInput className="form-control" id="product-categories" data-choices data-choices-groups data-placeholder="Select Categories">
                  <option>Choose a categories</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Sportswear">Sportswear</option>
                  <option value="Watches">Watches</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Headphones">Headphones</option>
                  <option value="Other Accessories">Other Accessories</option>
                </ChoicesFormInput>
              </form>
            </Col>
          </Row>
          <Row>
            <Col lg={4}>
              <form>
                <div className="mb-3">
                  <label htmlFor="product-brand" className="form-label">
                    Brand
                  </label>
                  <input type="text" id="product-brand" className="form-control" placeholder="Brand Name" />
                </div>
              </form>
            </Col>
            <Col lg={4}>
              <form>
                <div className="mb-3">
                  <label htmlFor="product-weight" className="form-label">
                    Weight
                  </label>
                  <input type="text" id="product-weight" className="form-control" placeholder="In gm & kg" defaultValue="300gm" />
                </div>
              </form>
            </Col>
            <Col lg={4}>
              <form>
                <label htmlFor="gender" className="form-label">
                  Gender
                </label>
                <ChoicesFormInput className="form-control" id="gender" data-choices data-choices-groups data-placeholder="Select Gender">
                  <option>Select Gender</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Other">Other</option>
                </ChoicesFormInput>
              </form>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col lg={4}>
              <div className="mt-3">
                <h5 className="text-dark fw-medium">Size :</h5>
                <div className="d-flex flex-wrap gap-2" role="group" aria-label="Basic checkbox toggle button group">
                  <input type="checkbox" className="btn-check" id="size-xs1" />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="size-xs1">
                    XS
                  </label>
                  <input type="checkbox" className="btn-check" id="size-s1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="size-s1">
                    S
                  </label>
                  <input type="checkbox" className="btn-check" id="size-m1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="size-m1">
                    M
                  </label>
                  <input type="checkbox" className="btn-check" id="size-xl1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="size-xl1">
                    Xl
                  </label>
                  <input type="checkbox" className="btn-check" id="size-xxl1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="size-xxl1">
                    XXL
                  </label>
                  <input type="checkbox" className="btn-check" id="size-3xl1" />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="size-3xl1">
                    3XL
                  </label>
                </div>
              </div>
            </Col>
            <Col lg={5}>
              <div className="mt-3">
                <h5 className="text-dark fw-medium">Colors :</h5>
                <div className="d-flex flex-wrap gap-2" role="group" aria-label="Basic checkbox toggle button group">
                  <input type="checkbox" className="btn-check" id="color-dark1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-dark1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-dark" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-yellow1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-yellow1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-warning" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-white1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-white1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-white" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-red1" defaultChecked />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-red1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-primary" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-green1" />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-green1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-success" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-blue1" />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-blue1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-danger" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-sky1" />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-sky1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-info" />
                    </span>
                  </label>
                  <input type="checkbox" className="btn-check" id="color-gray1" />
                  <label className="btn btn-light avatar-sm rounded d-flex justify-content-center align-items-center" htmlFor="color-gray1">
                    {' '}
                    <span>
                      {' '}
                      <IconifyIcon icon="bxs:circle" className="fs-18 text-secondary" />
                    </span>
                  </label>
                </div>
              </div>
            </Col>
          </Row>
          <Row>
            <Col lg={12}>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea className="form-control bg-light-subtle" id="description" rows={7} placeholder="Short description about the product" defaultValue={'Top in sweatshirt fabric made from a cotton blend with a soft brushed inside. Relaxed fit with dropped shoulders, long sleeves and ribbing around the neckline, cuffs and hem. Small metal text applique.'} />
              </div>
            </Col>
          </Row>
          <Row>
            <Col lg={4}>
              <form>
                <div className="mb-3">
                  <label htmlFor="product-id" className="form-label">
                    Tag Number
                  </label>
                  <input type="number" id="product-id" className="form-control" placeholder="#******" defaultValue={36294007} />
                </div>
              </form>
            </Col>
            <Col lg={4}>
              <form>
                <div className="mb-3">
                  <label htmlFor="product-stock" className="form-label">
                    Stock
                  </label>
                  <input type="number" id="product-stock" className="form-control" placeholder="Quantity" defaultValue={465} />
                </div>
              </form>
            </Col>
            <Col lg={4}>
              <label htmlFor="product-stock" className="form-label">
                Tag
              </label>
              <ChoicesFormInput defaultValue="Fashion" className="form-control" data-choices data-choices-removeitem options={{
              removeItemButton: true
            }}>
                <option value="Fashion">Fashion</option>
                <option value="Electronics">Electronics</option>
                <option value="Watches">Watches</option>
                <option value="Headphones">Headphones</option>
              </ChoicesFormInput>
            </Col>
          </Row>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as={'h4'}>Pricing Details</CardTitle>
        </CardHeader>
        <CardBody>
          <Row>
            <Col lg={4}>
              <form>
                <label htmlFor="product-price" className="form-label">
                  Price
                </label>
                <div className="input-group mb-3">
                  <span className="input-group-text fs-20">
                    <IconifyIcon icon="bx:dollar" />
                  </span>
                  <input type="number" id="product-price" className="form-control" defaultValue={80} />
                </div>
              </form>
            </Col>
            <Col lg={4}>
              <form>
                <label htmlFor="product-discount" className="form-label">
                  Discount
                </label>
                <div className="input-group mb-3">
                  <span className="input-group-text fs-20">
                    <IconifyIcon icon="bxs:discount" />
                  </span>
                  <input type="number" id="product-discount" className="form-control" defaultValue={30} />
                </div>
              </form>
            </Col>
            <Col lg={4}>
              <form>
                <label htmlFor="product-tex" className="form-label">
                  Tex
                </label>
                <div className="input-group mb-3">
                  <span className="input-group-text fs-20">
                    <IconifyIcon icon="bxs:file-txt" />
                  </span>
                  <input type="number" id="product-tex" className="form-control" defaultValue={3} />
                </div>
              </form>
            </Col>
          </Row>
        </CardBody>
      </Card>
      <div className="p-3 bg-light mb-3 rounded">
        <Row className="justify-content-end g-2">
          <Col lg={2}>
            <Link to="" className="btn btn-outline-secondary w-100">
              Reset
            </Link>
          </Col>
          <Col lg={2}>
            <Link to="" className="btn btn-primary w-100">
              Save
            </Link>
          </Col>
        </Row>
      </div>
    </Col>;
};
export default AddProduct;