import React from "react";
import styles from "./styles.module.scss";

interface Props {
  className?: string;
  label?: string;
  onClick: () => void;
}

// Add parent class for sub-components
const Input: React.FC<Props> = (props) => {
  return (
    <button
      onClick={props.onClick}
      className={`${styles.button} ${props.className}`}
    >
      <span>{props.label}</span>
    </button>
  );
};

Input.defaultProps = {
  className: "",
  label: "Button",
};

export default Input;
