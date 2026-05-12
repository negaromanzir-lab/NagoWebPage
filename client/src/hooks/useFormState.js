import { useState, useCallback } from 'react';

/**
 * Minimal form state hook.
 * Returns { values, errors, isSubmitting, handleChange, setError, setSubmitting, reset }
 */
export function useFormState(initialValues) {
  const [values,      setValues]      = useState(initialValues);
  const [errors,      setErrors]      = useState({});
  const [isSubmitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setError = useCallback((field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const setFieldErrors = useCallback((apiErrors = []) => {
    const map = {};
    apiErrors.forEach(({ field, message }) => { map[field] = message; });
    setErrors(map);
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    setError,
    setFieldErrors,
    setSubmitting,
    reset,
  };
}
