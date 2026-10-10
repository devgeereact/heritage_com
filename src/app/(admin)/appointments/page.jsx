import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import PageHeader from '@/components/herit/PageHeader';
import StatusChip from '@/components/herit/StatusChip';

/** Placeholder until Phase 3 (conflict-safe appointments and availability). */
const AppointmentsPage = () => (
  <div className="hd">
    <PageTitle title="Appointments" />
    <PageHeader title="Appointments" />
    <Card className="hd-card">
      <Card.Body>
        <StatusChip tone="neutral" icon="solar:calendar-bold">Coming in the next update</StatusChip>
        <p className="mt-3 mb-2">Booking, availability and reminders arrive in the next update. Until then, book appointments outside the app.</p>
        <p className="mb-0">Fittings already work: set a fitting date on a job and it shows on <Link to="/today">Today</Link> on the day.</p>
      </Card.Body>
    </Card>
  </div>
);

export default AppointmentsPage;
