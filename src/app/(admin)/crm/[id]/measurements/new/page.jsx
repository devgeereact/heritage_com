import { useCallback, useEffect, useState } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import MeasurementSetForm from '@/components/herit/MeasurementSetForm';

/** Full page for a new measurement set (big edits are pages, not modals). */
const NewMeasurementsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try { setClient(await heritApi.customers.get(id)); } catch (e) { setError(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const back = `/clients/${id}?tab=measurements`;
  return (
    <div className="hd">
      <PageTitle title="Add measurements" />
      <PageHeader back={{ to: back, label: client?.name || 'Client' }} title="Add measurements" subtitle={client ? `${client.name} · ${client.client_ref || ''}` : ''} />
      {error && <LoadError what="this client" error={error} onRetry={load} />}
      {!client && !error && <div className="text-center py-5"><Spinner role="status" /></div>}
      {client && (
        <Card className="hd-card"><Card.Body>
          <MeasurementSetForm customerId={client.id} clientName={client.name} onSaved={() => navigate(back)} onCancel={() => navigate(back)} />
        </Card.Body></Card>
      )}
    </div>
  );
};

export default NewMeasurementsPage;
