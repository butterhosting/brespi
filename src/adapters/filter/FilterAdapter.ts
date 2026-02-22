import { Env } from "@/Env";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";
import { Logger } from "@/Logger";

export class FilterAdapter extends AbstractAdapter {
  private readonly log = new Logger(__filename);
  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env, propertyResolver);
  }

  public async filter(artifacts: Artifact[], { filterCriteria }: Step.Filter): Promise<AdapterResult> {
    this.log.debug(`Preparing to filter artifacts; method=${filterCriteria.method}, artifacts.length=${artifacts.length}`);
    // Resolve strings in filter criteria
    const resolvedCriteria: Step.FilterCriteria =
      filterCriteria.method === "exact"
        ? { method: "exact", name: this.resolveString(filterCriteria.name) }
        : filterCriteria.method === "glob"
          ? { method: "glob", nameGlob: this.resolveString(filterCriteria.nameGlob) }
          : { method: "regex", nameRegex: this.resolveString(filterCriteria.nameRegex) };

    const { predicate } = this.filterCapability.createPredicate(resolvedCriteria);
    const result = artifacts.filter(predicate);

    this.log.info(`Successfully filtered artifacts; method=${filterCriteria.method}, input.length=${artifacts.length}, output.length=${result.length}`);
    return AdapterResult.create(result);
  }
}
