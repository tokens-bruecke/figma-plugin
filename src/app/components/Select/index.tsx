import React, { useState } from "react";

interface SelectProps {
  id: string;
  label: string;
  options: string[];
  onChange: (option: string) => void;
}

const Select = (props: SelectProps) => {
  const [selectedOption, setSelectedOption] = useState("");

  const handleOptionChange = (event) => {
    const option = event.target.value;
    setSelectedOption(option);
    props.onChange(option);
  };

  return (
    <div>
      <label htmlFor={props.id}>{props.label}</label>
      <select
        id={props.id}
        value={selectedOption}
        onChange={handleOptionChange}
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
