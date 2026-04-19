import { ComponentProps } from "react";

type Props = ComponentProps<"svg"> & {
  withLove?: boolean;
};
export function BrespiLogo({ withLove, ...props }: Props) {
  if (withLove) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 428 326" width={428} height={326} {...props}>
        <title>{"Group"}</title>
        <g fill="none" fillRule="evenodd">
          <path fill="#828080" d="M214.5 177.303 325 207.79l-1.125 95.837-134.583-45.908z" />
          <path fill="#B1AAAA" d="m325 207.79 102.644-33.373-3.262 88.76L324 304z" />
          <path fill="#2323F2" d="m214.5 177.303 63.319-38.76 149.825 35.874L325 207.79z" />
          <path fill="#8585F6" d="m199.403.536 116.942 19.05-203.79 238.133L0 213z" />
          <path fill="#B1AAAA" d="m0 213 112.555 44.719 45.617 67.506-107.84-46.312z" />
          <path fill="#D8D8D8" d="m112.555 257.719 203.79-238.133 32.27 73.113L158 325z" />
          <path
            fill="#FF1313"
            d="m53.5 97.525-7.758-6.978C18.19 65.861 0 49.58 0 29.6 0 13.317 12.947.525 29.425.525c9.309 0 18.244 4.282 24.075 11.048C59.331 4.807 68.266.525 77.575.525 94.053.525 107 13.317 107 29.599 107 49.58 88.81 65.86 61.258 90.6L53.5 97.525Z"
          />
        </g>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 428 326" width={428} height={326} {...props}>
      <title>{"Group Copy"}</title>
      <g fill="none" fillRule="evenodd">
        <path fill="#828080" d="M214.5 177.303 325 207.79l-1.125 95.837-134.583-45.908z" />
        <path fill="#B1AAAA" d="m325 207.79 102.644-33.373-3.262 88.76L324 304z" />
        <path fill="#2323F2" d="m214.5 177.303 63.319-38.76 149.825 35.874L325 207.79z" />
        <path fill="#8585F6" d="m199.403.536 116.942 19.05-203.79 238.133L0 213z" />
        <path fill="#B1AAAA" d="m0 213 112.555 44.719 45.617 67.506-107.84-46.312z" />
        <path fill="#D8D8D8" d="m112.555 257.719 203.79-238.133 32.27 73.113L158 325z" />
      </g>
    </svg>
  );
}
