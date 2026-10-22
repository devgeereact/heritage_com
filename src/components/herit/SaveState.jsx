/** Saving / saved / failed line, announced to screen readers. */
const TEXT = { saving: 'Saving…', saved: 'Saved', failed: 'Not saved' };

const SaveState = ({ state, error }) => (
  <div className={`hd-save ${state ? `hd-save--${state}` : ''}`} role="status" aria-live="polite">
    {state ? `${TEXT[state]}${state === 'failed' && error ? `: ${error}` : ''}` : ''}
  </div>
);

export default SaveState;
