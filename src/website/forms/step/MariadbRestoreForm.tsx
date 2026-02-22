import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for restoring a MariaDB database from a backup artifact using the <FormElements.Code summary>mariadb</FormElements.Code> client.
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
          <FormElements.Code break>mariadb://username:password@hostname:3306</FormElements.Code>.
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
    database: {
      label: "Database",
      description: "Specifies the name of the target database to restore into.",
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
  [Field.database]: string;
};
function defaultValues(existing: Step.MariadbRestore | undefined): Form {
  return {
    [Field.connection_format]: existing?.connection.format ?? "url",
    [Field.connection_url]: existing?.connection.format === "url" ? existing.connection.url : "",
    [Field.connection_properties_user]: existing?.connection.format === "properties" ? existing.connection.properties.user : "",
    [Field.connection_properties_password]: existing?.connection.format === "properties" ? existing.connection.properties.password : "",
    [Field.connection_properties_host]: existing?.connection.format === "properties" ? existing.connection.properties.host : "",
    [Field.connection_properties_port]: existing?.connection.format === "properties" ? (existing.connection.properties.port ?? "") : "",
    [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
    [Field.toolkit_mariadb]: existing?.toolkit.resolution === "manual" ? existing.toolkit.mariadb : "",
    [Field.database]: existing?.database ?? "",
  };
}

type Props = {
  id: string;
  existing?: Step.MariadbRestore;
  onSave: (step: Step.MariadbRestore) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function MariadbRestoreForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
        type: Step.Type.mariadb_restore,
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
              },
        database: values[Field.database],
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const connectionFormat = form.watch(Field.connection_format);
  const toolkitResolution = form.watch(Field.toolkit_resolution);
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
            </>
          )}
          <FormElements.LabeledInput
            field={Field.database}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
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
        stepType={Step.Type.mariadb_restore}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
MariadbRestoreForm.Field = Field;
MariadbRestoreForm.Label = Label;
