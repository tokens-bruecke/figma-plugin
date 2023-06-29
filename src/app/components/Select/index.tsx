import React, { useState } from "react";

const Select = ({ options, onChange }) => {
  const [selectedOption, setSelectedOption] = useState("");

  const handleOptionChange = (event) => {
    const option = event.target.value;
    setSelectedOption(option);
    onChange(option);
  };

  return (
    <select value={selectedOption} onChange={handleOptionChange}>
      <option value={selectedOption}>Select an option</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default Select;
