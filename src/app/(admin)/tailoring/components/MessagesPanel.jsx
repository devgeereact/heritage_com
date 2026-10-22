import { useCallback, useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import JobMessages from '@/components/herit/JobMessages';
import ChangeRequestCard from '@/components/herit/ChangeRequestCard';

/** Job detail, Messages tab (owner): the conversation plus this job's change requests. */
const MessagesPanel = ({ job }) => {
  const [crs, setCrs] = useState([]);
  const load = useCallback(() => {
    heritApi.messages.changeRequests({ job_id: job.id, status: 'all' }).then((r) => setCrs(r.items || [])).catch(() => setCrs([]));
  }, [job.id]);
  useEffect(() => { load(); }, [load]);
  const open = crs.filter((c) => c.status === 'open');
  const done = crs.filter((c) => c.status !== 'open');

  return (
    <>
      {open.length > 0 && (
        <section className="mb-3" aria-labelledby="mp-cr">
          <h2 id="mp-cr" className="h6">Change requests waiting ({open.length})</h2>
          {open.map((c) => <ChangeRequestCard key={c.id} cr={c} onDecided={load} />)}
        </section>
      )}
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h6">Conversation</h2>
          <JobMessages jobId={job.id} />
        </Card.Body>
      </Card>
      {done.length > 0 && (
        <details className="mb-3">
          <summary className="mb-2">Earlier change requests ({done.length})</summary>
          {done.map((c) => <ChangeRequestCard key={c.id} cr={c} />)}
        </details>
      )}
    </>
  );
};

export default MessagesPanel;
