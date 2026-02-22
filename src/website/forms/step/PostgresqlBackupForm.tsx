import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for creating PostgreSQL backups using <FormElements.Code summary>pg_dump</FormElements.Code>.
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
          Specifies the PostgreSQL connection string in the format{" "}
          <FormElements.Code break>postgresql://username:password@hostname:5432</FormElements.Code>.
        </>
      ),
    },
    connection_properties_user: {
      label: "Connection: user",
      description: "Specifies the PostgreSQL user.",
    },
    connection_properties_password: {
      label: "Connection: password",
      description: "Specifies the PostgreSQL password.",
    },
    connection_properties_host: {
      label: "Connection: host",
      description: "Specifies the PostgreSQL host.",
    },
    connection_properties_port: {
      label: "Connection: port",
      description: "Specifies the PostgreSQL port.",
    },
    toolkit_resolution: {
      label: "Toolkit resolution",
      description: (
        <>
          Specifies how to find PostgreSQL executables (like <FormElements.Code>psql</FormElements.Code>).
        </>
      ),
    },
    toolkit_psql: {
      label: 'Toolkit: "psql" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>psql</FormElements.Code> executable.
        </>
      ),
    },
    toolkit_pg_dump: {
      label: 'Toolkit: "pg_dump" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>pg_dump</FormElements.Code> executable.
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
  [Field.toolkit_psql]: string;
  [Field.toolkit_pg_dump]: string;
  [Field.databaseSelection_strategy]: "all" | "include" | "exclude";
  [Field.databaseSelection_inclusions]: string;
  [Field.databaseSelection_exclusions]: string;
};
function defaultValues(existing: Step.PostgresqlBackup | undefined): Form {
  return {
    [Field.connection_format]: existing?.connection.format ?? "url",
    [Field.connection_url]: existing?.connection.format === "url" ? existing.connection.url : "",
    [Field.connection_properties_user]: existing?.connection.format === "properties" ? existing.connection.properties.user : "",
    [Field.connection_properties_password]: existing?.connection.format === "properties" ? existing.connection.properties.password : "",
    [Field.connection_properties_host]: existing?.connection.format === "properties" ? existing.connection.properties.host : "",
    [Field.connection_properties_port]: existing?.connection.format === "properties" ? (existing.connection.properties.port ?? "") : "",
    [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
    [Field.toolkit_psql]: existing?.toolkit.resolution === "manual" ? existing.toolkit.psql : "",
    [Field.toolkit_pg_dump]: existing?.toolkit.resolution === "manual" ? existing.toolkit.pg_dump : "",
    [Field.databaseSelection_strategy]: existing?.databaseSelection.method ?? "all",
    [Field.databaseSelection_inclusions]:
      existing?.databaseSelection.method === "include" ? existing.databaseSelection.inclusions.join(",") : "",
    [Field.databaseSelection_exclusions]:
      existing?.databaseSelection.method === "exclude" ? existing.databaseSelection.exclusions.join(",") : "",
  };
}

type Props = {
  id: string;
  existing?: Step.PostgresqlBackup;
  onSave: (step: Step.PostgresqlBackup) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function PostgresqlBackupForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
        type: Step.Type.postgresql_backup,
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
                psql: values[Field.toolkit_psql],
                pg_dump: values[Field.toolkit_pg_dump],
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
                field={Field.toolkit_psql}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.toolkit_pg_dump}
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
        stepType={Step.Type.postgresql_backup}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
PostgresqlBackupForm.Field = Field;
PostgresqlBackupForm.Label = Label;
