import { ComponentProps } from "react";

type Props = ComponentProps<"svg"> & {
  withLove?: boolean;
};
export function BrespiLogo({ withLove, ...props }: Props) {
  if (withLove) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 514 326" width={514} height={326} {...props}>
        <title>{"Group"}</title>
        <g fill="none" fillRule="evenodd">
          <path fill="#828080" d="M300.5 177.303 411 207.79l-1.125 95.837-134.583-45.908z" />
          <path fill="#B1AAAA" d="m411 207.79 102.644-33.373-3.262 88.76L410 304z" />
          <path fill="#2323F2" d="m300.5 177.303 63.319-38.76 149.825 35.874L411 207.79z" />
          <path fill="#8585F6" d="m285.403.536 116.942 19.05-203.79 238.133L86 213z" />
          <path fill="#B1AAAA" d="m86 213 112.555 44.719 45.617 67.506-107.84-46.312z" />
          <path fill="#D8D8D8" d="m198.555 257.719 203.79-238.133 32.27 73.113L244 325z" />
          <path
            fill="#FF1313"
            d="m76.5 138.525-11.093-9.927C26.01 93.478 0 70.315 0 41.888 0 18.723 18.513.524 42.075.524c13.311 0 26.087 6.092 34.425 15.718C84.838 6.617 97.614.525 110.925.525 134.487.525 153 18.725 153 41.887c0 28.428-26.01 51.59-65.407 86.786L76.5 138.525Z"
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
