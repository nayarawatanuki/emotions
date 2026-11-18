import { DataSource, InstanceChecker } from 'typeorm';

// Application configuration must provide imported targets, never file patterns.
// This narrows the TypeORM discovery path; it does not patch picomatch itself.
export class ExplicitMetadataDataSource extends DataSource {
  private assertExplicitTargets(): void {
    for (const field of ['entities', 'migrations', 'subscribers'] as const) {
      const targets: unknown = this.options[field];
      if (targets === undefined) continue;
      if (
        !Array.isArray(targets) ||
        !targets.every(
          (target: unknown) =>
            typeof target === 'function' ||
            (field === 'entities' && InstanceChecker.isEntitySchema(target)),
        )
      )
        throw new Error(
          'A persistência exige referências importadas, sem descoberta por caminhos ou padrões.',
        );
    }
  }

  override async initialize(): Promise<this> {
    this.assertExplicitTargets();
    return super.initialize();
  }

  protected override async buildMetadatas(): Promise<void> {
    // Recheck immediately before discovery, including a change made via setOptions.
    this.assertExplicitTargets();
    await super.buildMetadatas();
  }
}
