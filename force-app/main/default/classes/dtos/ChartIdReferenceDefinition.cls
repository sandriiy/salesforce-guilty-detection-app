public class ChartIdReferenceDefinition {
    public String sourceObjectApiName;
    public String sourceFieldApiName;
    public String sourceFieldLabel;
    public String typeDiscriminatorFieldApiName;
    public String label;
    public String description;

    public ChartIdReferenceDefinition(
        String sourceObjectApiName,
        String sourceFieldApiName,
        String sourceFieldLabel,
        String typeDiscriminatorFieldApiName,
        String label,
        String description
    ) {
        this.sourceObjectApiName = sourceObjectApiName;
        this.sourceFieldApiName = sourceFieldApiName;
        this.sourceFieldLabel = sourceFieldLabel;
        this.typeDiscriminatorFieldApiName = typeDiscriminatorFieldApiName;
        this.label = label;
        this.description = description;
    }
}