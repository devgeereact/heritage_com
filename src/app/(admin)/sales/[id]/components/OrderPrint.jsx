import { Modal, Button } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

// Branded, printable invoice + packing slip generated straight from the live
// order (orders.php) — no Larkon demo data. One component, two modes:
//   invoice  → money document (prices, totals, balance due)
//   packing  → warehouse document (items + qty + ship-to, no prices)
//
// Print isolation is CSS-only: when this modal is open we hide everything on the
// page except #order-print, so window.print() yields a clean single sheet.

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? String(s) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
// The gift message is appended to notes by checkout; surface it on the slip.
const giftFrom = (notes) => {
  const m = String(notes || '').match(/Gift message:\s*(.+)/i);
  return m ? m[1].trim() : '';
};

const Brand = ({ docLabel }) => (
  <div className="d-flex justify-content-between align-items-start" style={{ borderBottom: '2px solid #9b2c2c', paddingBottom: 12 }}>
    <div>
      <div style={{ fontFamily: 'Libre Baskerville, Georgia, serif', fontSize: 22, fontWeight: 700, color: '#9b2c2c' }}>Herit Clothing</div>
      <div className="text-muted small">Ajuwon Market, Lagos · heritclothing.com · hello@heritclothing.com</div>
    </div>
    <div className="text-end">
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{docLabel}</div>
    </div>
  </div>
);

const OrderPrint = ({ show, onHide, order, mode = 'invoice' }) => {
  if (!order) return null;
  const isInvoice = mode === 'invoice';
  const items = (order.items || []).filter((it) => isInvoice || it.sku !== 'shipping');
  const balance = Number(order.total || 0) - Number(order.paid || 0);
  const gift = giftFrom(order.notes);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered contentClassName="order-print-modal">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #order-print, #order-print * { visibility: visible !important; }
          #order-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .order-print-noprint { display: none !important; }
        }
      `}</style>
      <Modal.Body>
        <div id="order-print">
          <Brand docLabel={isInvoice ? 'Invoice' : 'Packing Slip'} />

          <div className="d-flex justify-content-between mt-3">
            <div>
              <div className="text-muted small text-uppercase">{isInvoice ? 'Bill to' : 'Deliver to'}</div>
              <div className="fw-bold">{order.customer_name}</div>
              {order.customer_phone && <div>{order.customer_phone}</div>}
              {order.ship_address && <div style={{ maxWidth: 260 }}>{order.ship_address}</div>}
            </div>
            <div className="text-end">
              <div><span className="text-muted">Order:</span> <strong>{order.code}</strong></div>
              <div><span className="text-muted">Date:</span> {fmtDate(order.created_at)}</div>
              <div><span className="text-muted">Channel:</span> <span className="text-capitalize">{order.channel}</span></div>
              {isInvoice && <div><span className="text-muted">Payment:</span> <span className="text-capitalize">{order.payment_method}</span></div>}
            </div>
          </div>

          <table className="table table-sm mt-3 align-middle">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #333' }}>
                <th>Item</th>
                <th>SKU</th>
                <th className="text-center">Qty</th>
                {isInvoice && <th className="text-end">Unit</th>}
                {isInvoice && <th className="text-end">Line</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.label}</td>
                  <td className="small text-muted">{it.sku || '—'}</td>
                  <td className="text-center">{it.qty}</td>
                  {isInvoice && <td className="text-end">{naira(it.unit_price)}</td>}
                  {isInvoice && <td className="text-end">{naira(it.qty * it.unit_price)}</td>}
                </tr>
              ))}
            </tbody>
            {isInvoice && (
              <tfoot>
                <tr style={{ borderTop: '1.5px solid #333' }}>
                  <td colSpan={4} className="text-end fw-bold">Total</td>
                  <td className="text-end fw-bold">{naira(order.total)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="text-end text-muted">Paid</td>
                  <td className="text-end">{naira(order.paid)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="text-end fw-bold">Balance due</td>
                  <td className="text-end fw-bold" style={{ color: balance > 0 ? '#9b2c2c' : 'inherit' }}>{naira(balance)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {gift && (
            <div className="mt-2 p-2" style={{ background: '#faf5f0', borderLeft: '3px solid #9b2c2c' }}>
              <div className="text-muted small text-uppercase">Gift message</div>
              <div className="fst-italic">{gift}</div>
            </div>
          )}

          <div className="text-center text-muted small mt-4" style={{ borderTop: '1px solid #ddd', paddingTop: 10 }}>
            {isInvoice
              ? 'Thank you for wearing Herit. The story is in the cloth.'
              : 'Packed with care in Lagos — Herit Clothing.'}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="order-print-noprint">
        <Button variant="light" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={() => window.print()}>
          <IconifyIcon icon="solar:printer-bold" className="me-1" /> Print {isInvoice ? 'invoice' : 'packing slip'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrderPrint;
