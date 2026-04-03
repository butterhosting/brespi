import { Pipeline } from "@/models/Pipeline";
import { OmitBetter } from "@/types/OmitBetter";
import { PipelineRM } from "@/models/PipelineRM";
import { Yesttp } from "yesttp";

export class PipelineClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(): Promise<PipelineRM[]> {
    const { body } = await this.yesttp.get("/pipelines");
    return body.map(PipelineRM.parse);
  }

  public async find(id: string): Promise<PipelineRM> {
    const { body } = await this.yesttp.get(`/pipelines/${id}`);
    return PipelineRM.parse(body);
  }

  public async create(pipeline: OmitBetter<Pipeline, "id" | "object">): Promise<PipelineRM> {
    const { body } = await this.yesttp.post(`/pipelines`, {
      body: pipeline,
    });
    return PipelineRM.parse(body);
  }

  public async update(id: string, pipeline: OmitBetter<Pipeline, "id" | "object">): Promise<PipelineRM> {
    const { body } = await this.yesttp.put(`/pipelines/${id}`, {
      body: pipeline,
    });
    return PipelineRM.parse(body);
  }

  public async delete(id: string): Promise<PipelineRM> {
    const { body } = await this.yesttp.delete(`/pipelines/${id}`);
    return PipelineRM.parse(body);
  }
}
