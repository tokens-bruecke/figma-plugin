import React from "react";

interface CheckboxProps {
  id: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox = (props: CheckboxProps) => {
  const [checked, setChecked] = React.useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    props.onChange(event);
  };

  return (
    <div>
      <input
        id={props.id}
        type="checkbox"
        onChange={handleChange}
        checked={checked}
      />
      <label htmlFor={props.id}>{props.label}</label>
    </div>
  );
};

export default Checkbox;
