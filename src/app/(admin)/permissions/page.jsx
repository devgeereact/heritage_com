import { Card, CardBody, Table, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import { ACCESS_MATRIX, STAFF_ROLES, ROLE_LABELS } from '@/helpers/roles';

// Honest, read-only view of who-can-see-what. The grid is generated straight
// from the same role map the app enforces (src/helpers/roles.js), and every
// endpoint re-checks server-side — so this can't drift from real access.
const PermissionsPage = () => (
  <>
    <PageTItle title="Permissions" />
    <div className="mb-3">
      <h4 className="mb-1">Permissions</h4>
      <p className="text-muted mb-0">
        Which roles can open which modules. Access is enforced on the server for every request —
        change a person's role under <strong>Team &amp; Access</strong>.
      </p>
    </div>

    <Card>
      <CardBody className="p-0">
        <Table responsive bordered className="mb-0 align-middle text-center">
          <thead className="table-light">
            <tr>
              <th className="text-start">Module</th>
              {STAFF_ROLES.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {ACCESS_MATRIX.map((m) => (
              <tr key={m.key}>
                <td className="text-start fw-semibold">{m.label}</td>
                {STAFF_ROLES.map((r) => (
                  <td key={r}>
                    {m.roles.includes(r)
                      ? <IconifyIcon icon="solar:check-circle-bold" className="text-success fs-5" />
                      : <span className="text-muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </CardBody>
    </Card>

    <div className="mt-3 d-flex align-items-center gap-2 text-muted small">
      <Badge bg="light" text="dark"><IconifyIcon icon="solar:lock-keyhole-bold" className="me-1" />Server-enforced</Badge>
      Roles are fixed; module access is set in code and audited on every change.
    </div>
  </>
);

export default PermissionsPage;
