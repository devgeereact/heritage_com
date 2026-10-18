import { useState } from 'react';
import { FormControl, FormGroup, FormLabel } from 'react-bootstrap';
import Feedback from 'react-bootstrap/esm/Feedback';
import { Controller } from 'react-hook-form';
import IconifyIcon from '../wrappers/IconifyIcon';
const PasswordFormInput = ({
  name,
  containerClassName: containerClass,
  control,
  id,
  labelClassName: labelClass,
  label,
  noValidate,
  ...other
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return <Controller name={name} defaultValue={''} control={control} render={({
    field,
    fieldState
  }) => <FormGroup className={containerClass ?? ''}>
          {label && (typeof label === 'string' ? <FormLabel htmlFor={id ?? name} className={labelClass}>
                {label}
              </FormLabel> : <>{label}</>)}
          <div className="position-relative">
            <FormControl id={id} type={showPassword ? 'text' : 'password'} {...other} {...field} isInvalid={Boolean(fieldState.error?.message)} />
            {!noValidate && fieldState.error?.message && <Feedback type="invalid">{fieldState.error?.message}</Feedback>}
            {!fieldState.error && (
              <button
                type="button"
                className="btn btn-link d-flex position-absolute top-50 end-0 translate-middle-y p-0 pe-2 me-2 text-reset"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}>
                <IconifyIcon icon={showPassword ? 'bi:eye-slash-fill' : 'bi:eye-fill'} height={18} width={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </FormGroup>} />;
};
export default PasswordFormInput;