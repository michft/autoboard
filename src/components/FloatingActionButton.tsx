import { Component } from "solid-js";

interface FloatingActionButtonProps {
  onClick: () => void;
}

const FloatingActionButton: Component<FloatingActionButtonProps> = (props) => {
  return (
    <button
      class="fab"
      onClick={props.onClick}
      aria-label="Create new feature"
      title="Create new feature"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
};

export default FloatingActionButton;
