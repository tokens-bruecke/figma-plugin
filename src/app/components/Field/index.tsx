import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.scss';

import { Icon, IconButton, Input, NativeDropdown } from 'react-figma-ui/ui';

interface FieldProps {
  id: string;
  label: string;
  isOptional?: boolean;
  /** A visible action at the end of the label row, e.g. "Create token" */
  link?: { label: string; href: string };
  /** Helper text under the control */
  hint?: React.ReactNode;
  /** Takes the hint's place under the control */
  error?: string;
  children: React.ReactNode;
}

/** A visible label above the control, and helper text or an error below it */
export const Field = (props: FieldProps) => {
  const { id, label, isOptional, link, hint, error, children } = props;

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          <span className={styles.labelText}>{label}</span>
          {isOptional && <span className={styles.optional}>optional</span>}
        </label>
        {link && (
          <a
            className={styles.link}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.linkLabel}>{link.label}</span> ↗
          </a>
        )}
      </div>

      {children}

      {error ? (
        <span id={`${id}-message`} className={styles.error} aria-live="polite">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-message`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
};

interface SelectInputProps {
  id: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}

/**
 * The kit's native select: bordered like the inputs and usable with the
 * keyboard, unlike the custom Dropdown. The kit doesn't pass the id on.
 */
export const SelectInput = (props: SelectInputProps) => {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const select = slotRef.current?.querySelector('select');
    if (select) select.id = props.id;
  }, [props.id]);

  return (
    <div ref={slotRef}>
      <NativeDropdown
        value={props.value}
        options={props.options}
        onChange={props.onChange}
      />
    </div>
  );
};

interface TextInputProps {
  id: string;
  value: string;
  placeholder?: string;
  isInvalid?: boolean;
  isSecret?: boolean;
  /** The field has a hint or an error with the id `${id}-message` */
  hasMessage?: boolean;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
}

/**
 * The kit's Input, plus what it can't set itself: masking for secrets and
 * the attributes that tie the input to its hint or error.
 */
export const TextInput = (props: TextInputProps) => {
  const { id, isSecret, isInvalid, hasMessage } = props;
  const slotRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const input = slotRef.current?.querySelector('input');
    if (!input) return;

    input.type = isSecret && !isRevealed ? 'password' : 'text';
    // keeps password managers from offering a saved login for a token
    input.autocomplete = isSecret ? 'new-password' : 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('aria-invalid', String(!!isInvalid));

    if (hasMessage) {
      input.setAttribute('aria-describedby', `${id}-message`);
    } else {
      input.removeAttribute('aria-describedby');
    }

    const revealButton = slotRef.current.querySelector('button');
    if (revealButton) {
      revealButton.setAttribute(
        'aria-label',
        isRevealed ? 'Hide token' : 'Show token'
      );
      revealButton.setAttribute('aria-pressed', String(isRevealed));
    }
  });

  // The reveal button sits inside the field, so a secret field keeps the
  // same width as every other input
  return (
    <div
      ref={slotRef}
      className={[styles.inputRow, isSecret ? styles.hasReveal : ''].join(' ')}
    >
      <Input
        id={id}
        className={styles.input}
        value={props.value}
        placeholder={props.placeholder}
        isInvalid={isInvalid}
        onChange={props.onChange}
        onBlur={props.onBlur}
      />
      {isSecret && (
        <IconButton
          className={styles.reveal}
          onClick={() => setIsRevealed(!isRevealed)}
        >
          <Icon name={isRevealed ? 'hidden' : 'visible'} size="32" />
        </IconButton>
      )}
    </div>
  );
};
