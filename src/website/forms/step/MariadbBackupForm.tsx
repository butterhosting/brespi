import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for creating MariaDB backups using <FormElements.Code summary>mariadb-dump</FormElements.Code>.
    </>
  ),
  fields: {
    connection_format: {
      label: "Connection: format",
      description: "Specifies whether to provide connection details as a URL or as individual properties.",
    },
    connection_url: {
      label: "Connection: url",
      description: (
        <>
          Specifies the MariaDB connection string in the format{" "}
          <FormElements.Code break>mariadb://username:password@hostname:3306</FormElements.Code> or{" "}
          <FormElements.Code break>mysql://username:password@hostname:3306</FormElements.Code>.
        </>
      ),
    },
    connection_properties_user: {
      label: "Connection: user",
      description: "Specifies the MariaDB user.",
    },
    connection_properties_password: {
      label: "Connection: password",
      description: "Specifies the MariaDB password.",
    },
    connection_properties_host: {
      label: "Connection: host",
      description: "Specifies the MariaDB host.",
    },
    connection_properties_port: {
      label: "Connection: port",
      description: "Specifies the MariaDB port.",
    },
    toolkit_resolution: {
      label: "Toolkit resolution",
      description: (
        <>
          Specifies how to find MariaDB executables (like <FormElements.Code>mariadb</FormElements.Code>).
        </>
      ),
    },
    toolkit_mariadb: {
      label: 'Toolkit: "mariadb" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>mariadb</FormElements.Code> executable.
        </>
      ),
    },
    toolkit_mariadb_dump: {
      label: 'Toolkit: "mariadb-dump" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>mariadb-dump</FormElements.Code> executable.
        </>
      ),
    },
    databaseSelection_strategy: {
      label: "Database selection method",
      description: "Specifies whether to backup all databases, or only a selection.",
    },
    databaseSelection_inclusions: {
      label: "Database selection: inclusions",
      description: "Specifies (comma-separated) database names to include in the backup.",
    },
    databaseSelection_exclusions: {
      label: "Database selection: exclusions",
      description: "Specifies (comma-separated) database names to exclude from the backup.",
    },
  },
});

type Form = {
  [Field.connection_format]: "url" | "properties";
  [Field.connection_url]: string;
  [Field.connection_properties_user]: string;
  [Field.connection_properties_password]: string;
  [Field.connection_properties_host]: string;
  [Field.connection_properties_port]: string;
  [Field.toolkit_resolution]: "automatic" | "manual";
  [Field.toolkit_mariadb]: string;
  [Field.toolkit_mariadb_dump]: string;
  [Field.databaseSelection_strategy]: "all" | "include" | "exclude";
  [Field.databaseSelection_inclusions]: string;
  [Field.databaseSelection_exclusions]: string;
};
function defaultValues(existing: Step.MariadbBackup | undefined): Form {
  return {
    [Field.connection_format]: existing?.connection.format ?? "url",
    [Field.connection_url]: existing?.connection.format === "url" ? existing.connection.url : "",
    [Field.connection_properties_user]: existing?.connection.format === "properties" ? existing.connection.properties.user : "",
    [Field.connection_properties_password]: existing?.connection.format === "properties" ? existing.connection.properties.password : "",
    [Field.connection_properties_host]: existing?.connection.format === "properties" ? existing.connection.properties.host : "",
    [Field.connection_properties_port]: existing?.connection.format === "properties" ? (existing.connection.properties.port ?? "") : "",
    [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
    [Field.toolkit_mariadb]: existing?.toolkit.resolution === "manual" ? existing.toolkit.mariadb : "",
    [Field.toolkit_mariadb_dump]: existing?.toolkit.resolution === "manual" ? existing.toolkit["mariadb-dump"] : "",
    [Field.databaseSelection_strategy]: existing?.databaseSelection.method ?? "all",
    [Field.databaseSelection_inclusions]:
      existing?.databaseSelection.method === "include" ? existing.databaseSelection.inclusions.join(",") : "",
    [Field.databaseSelection_exclusions]:
      existing?.databaseSelection.method === "exclude" ? existing.databaseSelection.exclusions.join(",") : "",
  };
}

type Props = {
  id: string;
  existing?: Step.MariadbBackup;
  onSave: (step: Step.MariadbBackup) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function MariadbBackupForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
        type: Step.Type.mariadb_backup,
        connection:
          values[Field.connection_format] === "url"
            ? { format: "url", url: values[Field.connection_url] }
            : {
                format: "properties",
                properties: {
                  user: values[Field.connection_properties_user],
                  password: values[Field.connection_properties_password],
                  host: values[Field.connection_properties_host],
                  port: values[Field.connection_properties_port] || undefined,
                },
              },
        toolkit:
          values[Field.toolkit_resolution] === "automatic"
            ? { resolution: "automatic" }
            : {
                resolution: "manual",
                mariadb: values[Field.toolkit_mariadb],
                "mariadb-dump": values[Field.toolkit_mariadb_dump],
              },
        databaseSelection:
          values[Field.databaseSelection_strategy] === "all"
            ? {
                method: "all",
              }
            : values[Field.databaseSelection_strategy] === "include"
              ? {
                  method: "include",
                  inclusions: values[Field.databaseSelection_inclusions].split(",").filter(Boolean),
                }
              : {
                  method: "exclude",
                  exclusions: values[Field.databaseSelection_exclusions].split(",").filter(Boolean),
                },
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const connectionFormat = form.watch(Field.connection_format);
  const toolkitResolution = form.watch(Field.toolkit_resolution);
  const databaseSelectionStrategy = form.watch(Field.databaseSelection_strategy);
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.connection_format}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["url", "properties"] }}
          />
          {connectionFormat === "url" && (
            <FormElements.LabeledInput
              field={Field.connection_url}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {connectionFormat === "properties" && (
            <>
              <FormElements.LabeledInput
                field={Field.connection_properties_user}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.connection_properties_password}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.connection_properties_host}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.connection_properties_port}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
            </>
          )}
          <FormElements.LabeledInput
            field={Field.toolkit_resolution}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["automatic", "manual"] }}
          />
          {toolkitResolution === "manual" && (
            <>
              <FormElements.LabeledInput
                field={Field.toolkit_mariadb}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.toolkit_mariadb_dump}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
            </>
          )}
          <FormElements.LabeledInput
            field={Field.databaseSelection_strategy}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["all", "include", "exclude"] }}
          />
          {databaseSelectionStrategy === "include" && (
            <FormElements.LabeledInput
              field={Field.databaseSelection_inclusions}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {databaseSelectionStrategy === "exclude" && (
            <FormElements.LabeledInput
              field={Field.databaseSelection_exclusions}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
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
        stepType={Step.Type.mariadb_backup}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
MariadbBackupForm.Field = Field;
MariadbBackupForm.Label = Label;
