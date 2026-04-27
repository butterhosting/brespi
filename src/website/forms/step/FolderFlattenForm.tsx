import { Step } from "@/models/Step";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for flattening a nested folder structure into a single collection of file artifacts.",
  fields: {
    level: {
      label: "Level",
      description: "The number of subdirectories to flatten (use -1 to fully flatten)",
    },
  },
});
type Form = {
  [Field.level]: number;
};
function defaultValues(existing: Step.FolderFlatten | undefined): Form {
  return {
    [Field.level]: existing?.level ?? -1,
  };
}

type Props = {
  id: string;
  existing?: Step.FolderFlatten;
  onSave: (step: Step.FolderFlatten) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FolderFlattenForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => form.reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (values) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.folder_flatten,
        level: Number(values[Field.level]),
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.level}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "number" }}
          />
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        form={form} //
        stepType={Step.Type.folder_flatten}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
FolderFlattenForm.Field = Field;
FolderFlattenForm.Label = Label;
