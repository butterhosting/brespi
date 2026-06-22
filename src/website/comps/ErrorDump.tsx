import { ProblemDetails } from "@/models/ProblemDetails";
import { Icon } from "./Icon";
import { ClientError } from "@/errors/ClientError";

type Props = {
  error: any;
};
export function ErrorDump({ error }: Props) {
  const { problem, details } = ProblemDetails.isInstance(error)
    ? error
    : typeof error?.message === "string"
      ? ClientError.unknown({ message: error.message }).problemDetails()
      : ClientError.unknown().problemDetails();
  return (
    <div className="inline-block text-left text-c-error">
      <div className="inline-flex gap-2">
        <Icon variant="error" className="size-5" />
        <code>{problem}</code>
      </div>
      {details && <pre className="mt-4">{JSON.stringify(details, null, 2)}</pre>}
    </div>
  );
}
