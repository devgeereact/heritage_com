import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Spinner, Alert, Row, Col, Button } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';

const DAY = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-GB', { weekday: 'short' }); };

const WeatherPage = () => {
  const [d, setD] = useState(null);
  const [state, setState] = useState('loading');

  const load = useCallback(async () => {
    try { setD(await heritApi.weather()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const c = d?.current;

  return (
    <>
      <PageTitle title="Weather & Ops" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div><h4 className="mb-1">Weather &amp; Ops</h4><p className="text-muted mb-0">Lagos forecast, turned into the day&apos;s trading calls.</p></div>
        <Button variant="light" onClick={load} disabled={state === 'loading'}><IconifyIcon icon="solar:refresh-bold" className="me-1" /> Refresh</Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Weather offline.</strong> Upload <code>php-api/weather.php</code> (proxies Open-Meteo — no API key needed), then refresh.</Alert>}

      {state === 'ready' && (
        <Row className="g-3">
          {/* current conditions */}
          <Col lg={4}>
            <Card className="h-100 text-white" style={{ background: 'linear-gradient(135deg, var(--bs-primary), #7f1d1d)' }}>
              <CardBody className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="mb-1 opacity-75"><IconifyIcon icon="solar:map-point-bold" className="me-1" />{d.location}</p>
                    <h1 className="display-4 fw-bold mb-0">{c.temp}°</h1>
                    <p className="fs-5 mb-0">{c.label}</p>
                  </div>
                  <IconifyIcon icon={c.icon} style={{ fontSize: '3.5rem' }} />
                </div>
                <div className="d-flex gap-4 mt-auto pt-4 small">
                  <span><IconifyIcon icon="solar:waterdrop-bold" className="me-1" />{c.humidity}% humidity</span>
                  <span><IconifyIcon icon="solar:wind-bold" className="me-1" />{c.wind} km/h</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* 5-day */}
          <Col lg={8}>
            <Card className="h-100"><CardBody>
              <h5 className="mb-3">Next 5 days</h5>
              <Row className="g-2 text-center">
                {d.daily.map((day, i) => (
                  <Col key={day.date}>
                    <div className="border rounded p-2 h-100">
                      <div className="fw-semibold small">{i === 0 ? 'Today' : DAY(day.date)}</div>
                      <IconifyIcon icon={day.icon} className="my-2 text-primary" style={{ fontSize: '1.8rem' }} />
                      <div className="fw-bold">{day.max}°<span className="text-muted fw-normal small"> / {day.min}°</span></div>
                      <div className="small text-info"><IconifyIcon icon="solar:cloud-rain-linear" /> {day.precip_prob}%</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </CardBody></Card>
          </Col>

          {/* ops nudges */}
          <Col xs={12}>
            <h5 className="mb-2 mt-2">Today&apos;s trading calls</h5>
            <Row className="g-3">
              {d.ops.map((o, i) => (
                <Col md={6} xl={4} key={i}>
                  <Card className={`h-100 border-${o.tone}`}>
                    <CardBody className="d-flex gap-3">
                      <span className={`avatar-md d-inline-flex align-items-center justify-content-center rounded fs-3 bg-${o.tone}-subtle text-${o.tone}`}><IconifyIcon icon={o.icon} /></span>
                      <div><h6 className="mb-1">{o.title}</h6><p className="text-muted mb-0 small">{o.tip}</p></div>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      )}
    </>
  );
};

export default WeatherPage;
