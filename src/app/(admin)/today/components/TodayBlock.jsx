import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

/**
 * One Today block: title, count, up to five rows that each open the record in
 * one tap, and a "See all" link. Empty blocks show one line with one next step.
 */
const TodayBlock = ({ id, title, icon, count = 0, total, rows = [], seeAll, empty, tone }) => {
  const shown = rows.slice(0, 5)
  return (
    <Card className="hd-card h-100" as="section" aria-labelledby={`tb-${id}`}>
      <Card.Header className="d-flex align-items-center justify-content-between gap-2 py-2">
        <h2 id={`tb-${id}`} className="h6 mb-0 d-flex align-items-center gap-2">
          <IconifyIcon icon={icon} aria-hidden="true" className={tone === 'bad' && count ? 'text-danger' : ''} />
          {title}
        </h2>
        <span className="d-flex align-items-center gap-2">
          {total && <span className="money small text-muted">{total}</span>}
          <span className="hd-count" aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}>
            {count}
          </span>
        </span>
      </Card.Header>
      <Card.Body className="p-0">
        {count === 0 ? (
          <div className="px-3 py-3 text-muted">{empty}</div>
        ) : (
          <div>
            {shown.map((r) => {
              const inner = (
                <>
                  <span className="hd-row-main">
                    <span className="hd-row-title d-block text-truncate">{r.title}</span>
                    {r.sub && <span className="hd-row-sub d-block text-truncate">{r.sub}</span>}
                  </span>
                  {r.right && <span className="text-end flex-none">{r.right}</span>}
                  <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" className="text-muted flex-none" />
                </>
              )
              // A row either opens a record (link) or starts a short action (button).
              return r.onClick ? (
                <button key={r.key} type="button" className="hd-row w-100 text-start bg-transparent border-0 border-top" onClick={r.onClick}>
                  {inner}
                </button>
              ) : (
                <Link key={r.key} to={r.to} className="hd-row">
                  {inner}
                </Link>
              )
            })}
          </div>
        )}
      </Card.Body>
      {seeAll && count > shown.length && (
        <Card.Footer className="bg-transparent py-2">
          <Link to={seeAll}>See all {count}</Link>
        </Card.Footer>
      )}
    </Card>
  )
}

export default TodayBlock
