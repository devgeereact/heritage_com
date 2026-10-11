import StatusChip from '@/components/herit/StatusChip'

/** Status of a CMS item, as text plus icon (never colour alone). */
const CmsStatus = ({ item, dirty }) => {
  if (!item?.id) return <StatusChip tone="neutral">Not saved yet</StatusChip>
  return (
    <span className="d-inline-flex flex-wrap gap-2">
      {item.status === 'published' ? (
        <StatusChip tone="ok">Published</StatusChip>
      ) : item.status === 'unpublished' ? (
        <StatusChip tone="neutral">Unpublished</StatusChip>
      ) : (
        <StatusChip tone="neutral">Draft, never published</StatusChip>
      )}
      {item.has_draft && item.status === 'published' && <StatusChip tone="warn">Changes not published</StatusChip>}
      {dirty && <StatusChip tone="warn">Unsaved changes</StatusChip>}
    </span>
  )
}

export default CmsStatus
